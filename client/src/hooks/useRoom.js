import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket } from '../lib/socket';
import { getIceServers } from '../lib/rtc';

async function getMedia() {
  try {
    return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch {
    // Camera missing or busy: fall back to audio only.
    return await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

export function useRoom(code, initial = {}) {
  const [status, setStatus] = useState('joining'); // joining | joined | reconnecting | error
  const [attempt, setAttempt] = useState(0); // bumped after a reconnect to rejoin from scratch
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  // socketId -> { name, stream, micOn, camOn, connection, screenId, screenStream }
  const [peers, setPeers] = useState({});
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenStream, setScreenStream] = useState(null); // our own screen share
  const [shareError, setShareError] = useState('');
  const [selfId, setSelfId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);

  const localRef = useRef(null);
  const screenRef = useRef(null);
  const pcsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const queuesRef = useRef(new Map()); // socketId -> promise chain, keeps signals in order
  const pendingRef = useRef(new Set()); // peers that still need a renegotiation
  const politeRef = useRef(new Set()); // peers where we give way in a collision
  const sendersRef = useRef(new Map()); // socketId -> senders carrying our screen
  const prefsRef = useRef({ ...initial }); // mic/camera choices; kept up to date for rejoins

  // Run work for one peer strictly after the previous work for that peer.
  const enqueue = useCallback((id, task) => {
    const prev = queuesRef.current.get(id) ?? Promise.resolve();
    queuesRef.current.set(id, prev.then(task).catch(console.error));
  }, []);

  // Send a fresh offer to one peer (used when our tracks change mid-call).
  const negotiate = useCallback(async (id) => {
    const pc = pcsRef.current.get(id);
    if (!pc) return;
    if (pc.signalingState !== 'stable') {
      pendingRef.current.add(id); // try again once the current exchange finishes
      return;
    }
    pendingRef.current.delete(id);
    await pc.setLocalDescription(await pc.createOffer());
    connectSocket().emit('signal', { to: id, data: { description: pc.localDescription } });
  }, []);

  const addScreenTracks = useCallback((id, pc) => {
    const stream = screenRef.current;
    if (!stream) return;
    sendersRef.current.set(id, stream.getTracks().map((t) => pc.addTrack(t, stream)));
  }, []);

  const stopShare = useCallback(() => {
    const stream = screenRef.current;
    if (!stream) return;
    screenRef.current = null;
    setScreenStream(null);
    stream.getTracks().forEach((t) => {
      t.onended = null;
      t.stop();
    });
    sendersRef.current.forEach((senders, id) => {
      const pc = pcsRef.current.get(id);
      if (!pc) return;
      senders.forEach((s) => {
        try {
          pc.removeTrack(s);
        } catch {
          /* connection already closed */
        }
      });
      enqueue(id, () => negotiate(id));
    });
    sendersRef.current.clear();
    connectSocket().emit('room:screen-stop');
  }, [enqueue, negotiate]);

  const startShare = useCallback(async () => {
    if (screenRef.current) return;
    setShareError('');
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    } catch {
      return; // the person closed the picker
    }
    const socket = connectSocket();
    const res = await new Promise((resolve) =>
      socket
        .timeout(5000)
        .emit('room:screen-start', { streamId: stream.id }, (err, r) =>
          resolve(err ? { error: 'The server did not respond' } : r)
        )
    );
    if (res.error) {
      stream.getTracks().forEach((t) => t.stop());
      setShareError(res.error);
      setTimeout(() => setShareError(''), 4000);
      return;
    }
    const video = stream.getVideoTracks()[0];
    video.contentHint = 'detail'; // favor sharp text over smooth motion
    video.onended = () => stopShare(); // the browser's own "Stop sharing" bar
    screenRef.current = stream;
    setScreenStream(stream);
    pcsRef.current.forEach((pc, id) => {
      addScreenTracks(id, pc);
      enqueue(id, () => negotiate(id));
    });
  }, [addScreenTracks, enqueue, negotiate, stopShare]);

  useEffect(() => {
    let cancelled = false;
    let hasJoined = false; // joined during THIS run of the effect
    let wasDisconnected = false; // lets us tell a reconnect from the very first connect
    const socket = connectSocket();
    const pcs = pcsRef.current;
    const restarts = new Map(); // socketId -> how many ICE restarts we tried

    const fail = (message) => {
      if (cancelled) return;
      setError(message);
      setStatus('error');
      localRef.current?.getTracks().forEach((t) => t.stop());
    };

    const createPeer = (id, info, initiator) => {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcs.set(id, pc);
      if (!initiator) politeRef.current.add(id);

      const local = localRef.current;
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      // If we have no camera or mic, still be able to receive theirs.
      if (!local.getVideoTracks().length) pc.addTransceiver('video', { direction: 'recvonly' });
      if (!local.getAudioTracks().length) pc.addTransceiver('audio', { direction: 'recvonly' });

      // Someone joined while we are sharing: send them the screen too.
      if (screenRef.current) {
        addScreenTracks(id, pc);
        pendingRef.current.add(id);
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: id, data: { candidate: e.candidate } });
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        if (!stream) return;
        setPeers((p) => {
          const peer = p[id];
          if (!peer) return p;
          return {
            ...p,
            [id]: stream.id === peer.screenId ? { ...peer, screenStream: stream } : { ...peer, stream },
          };
        });
      };
      pc.onconnectionstatechange = () => {
        const s = pc.connectionState;
        const connection =
          s === 'connected' ? 'connected' : s === 'failed' ? 'failed' : s === 'disconnected' ? 'disconnected' : 'connecting';
        setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], connection } } : p));

        if (s === 'connected') restarts.delete(id);

        // Self-repair: a failed link gets up to 3 ICE restarts. Only one side
        // (the one that made the first offer) does it, so the two never collide.
        if (s === 'failed' && !politeRef.current.has(id) && (restarts.get(id) || 0) < 3) {
          restarts.set(id, (restarts.get(id) || 0) + 1);
          pc.restartIce?.();
          enqueue(id, () => negotiate(id));
        }
      };

      setPeers((p) => ({
        ...p,
        [id]: {
          name: info.name,
          micOn: info.micOn !== false,
          camOn: info.camOn !== false,
          connection: 'connecting',
          stream: null,
          screenId: info.screenId || null,
          screenStream: null,
        },
      }));

      if (initiator) {
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => socket.emit('signal', { to: id, data: { description: pc.localDescription } }))
          .catch(console.error);
      }
    };

    const removePeer = (id) => {
      pcs.get(id)?.close();
      pcs.delete(id);
      queuesRef.current.delete(id);
      pendingRef.current.delete(id);
      politeRef.current.delete(id);
      sendersRef.current.delete(id);
      restarts.delete(id);
      setPeers((p) => {
        const { [id]: _gone, ...rest } = p;
        return rest;
      });
    };

    const handleSignal = async (from, data) => {
      const pc = pcs.get(from);
      if (!pc || !data) return;

      if (data.description) {
        const isOffer = data.description.type === 'offer';

        // Both sides sent an offer at once. One gives way, the other wins.
        if (isOffer && pc.signalingState !== 'stable') {
          if (!politeRef.current.has(from)) return; // we win: ignore their offer
          await pc.setLocalDescription({ type: 'rollback' });
          pendingRef.current.add(from); // and redo our change afterwards
        }

        await pc.setRemoteDescription(data.description);
        if (isOffer) {
          await pc.setLocalDescription(await pc.createAnswer());
          socket.emit('signal', { to: from, data: { description: pc.localDescription } });
        }
        // The exchange is finished: send any change that was waiting.
        if (pc.signalingState === 'stable' && pendingRef.current.has(from)) {
          await negotiate(from);
        }
      } else if (data.candidate) {
        await pc.addIceCandidate(data.candidate);
      }
    };

    const onSignal = ({ from, data }) => enqueue(from, () => handleSignal(from, data));

    const onPeerJoined = (peer) => createPeer(peer.id, peer, false);
    const onPeerLeft = ({ id }) => removePeer(id);
    const onPeerMedia = ({ id, micOn: m, camOn: c }) =>
      setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], micOn: m, camOn: c } } : p));
    const onPeerScreen = ({ id, screenId }) =>
      setPeers((p) =>
        p[id]
          ? { ...p, [id]: { ...p[id], screenId, screenStream: screenId ? p[id].screenStream : null } }
          : p
      );
    const onChat = (m) => setMessages((list) => [...list, m]);
    const onFile = (f) => setFiles((list) => [f, ...list.filter((x) => x.id !== f.id)]);

    const onDisconnect = (reason) => {
      if (reason === 'io client disconnect') return; // we closed it ourselves (logout)
      if (reason === 'io server disconnect') {
        return fail('You were disconnected by the server. Refresh to rejoin.');
      }
      // Network drop: the browser keeps retrying by itself. Just tell the person.
      wasDisconnected = true;
      setStatus((s) => (s === 'error' ? s : 'reconnecting'));
    };
    const onConnect = () => {
      // Back online. The server forgot us, so rejoin from scratch.
      if (wasDisconnected && !cancelled) {
        wasDisconnected = false;
        setAttempt((n) => n + 1);
      }
    };
    const onConnectError = (e) => {
      if (e.message === 'unauthorized') return fail('Your session expired. Please log in again.');
      // socket.active is true while the browser is still going to retry.
      if (!socket.active || !hasJoined) fail('Could not reach the server.');
    };

    socket.on('room:peer-joined', onPeerJoined);
    socket.on('room:peer-left', onPeerLeft);
    socket.on('room:peer-media', onPeerMedia);
    socket.on('room:peer-screen', onPeerScreen);
    socket.on('chat:message', onChat);
    socket.on('file:shared', onFile);
    socket.on('signal', onSignal);
    socket.on('disconnect', onDisconnect);
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);

    (async () => {
      let stream;
      try {
        stream = await getMedia();
      } catch {
        return fail('Camera and microphone access is needed. Allow it in your browser, then refresh.');
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
            // Start with the mic and camera exactly as chosen on the preview screen.
      const wantMic = prefsRef.current.micOn !== false;
      const wantCam = prefsRef.current.camOn !== false;
      stream.getAudioTracks().forEach((t) => {
        t.enabled = wantMic;
      });
      stream.getVideoTracks().forEach((t) => {
        t.enabled = wantCam;
      });
      const hasMic = stream.getAudioTracks().length > 0 && wantMic;
      const hasCam = stream.getVideoTracks().length > 0 && wantCam;
      localRef.current = stream;
      setLocalStream(stream);
      setMicOn(hasMic);
      setCamOn(hasCam);

      socket.timeout(8000).emit('room:join', { code, micOn: hasMic, camOn: hasCam }, (err, res) => {
        if (cancelled) return;
        if (err) return fail('The server did not respond. Please try again.');
        if (res.error) return fail(res.error);
        hasJoined = true;
        setRoomName(res.room.name);
        setStatus('joined');
        setSelfId(res.selfId);
        setMessages(res.chat || []);
        setFiles(res.files || []);
        // We are the newcomer, so we make the offers.
        res.peers.forEach((p) => createPeer(p.id, p, true));
      });
    })();

    return () => {
      cancelled = true;
      socket.off('room:peer-joined', onPeerJoined);
      socket.off('room:peer-left', onPeerLeft);
      socket.off('room:peer-media', onPeerMedia);
      socket.off('room:peer-screen', onPeerScreen);
      socket.off('chat:message', onChat);
      socket.off('file:shared', onFile);
      socket.off('signal', onSignal);
      socket.off('disconnect', onDisconnect);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.emit('room:leave');
      pcs.forEach((pc) => pc.close());
      pcs.clear();
      queuesRef.current.clear();
      pendingRef.current.clear();
      politeRef.current.clear();
      sendersRef.current.clear();
      restarts.clear();
      screenRef.current?.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      screenRef.current = null;
      setScreenStream(null);
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      setLocalStream(null);
      setPeers({});
      setMessages([]);
      setFiles([]);
      setSelfId(null);
      setStatus('joining');
      setError('');
    };
  }, [code, attempt, enqueue, negotiate, addScreenTracks]);

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    prefsRef.current.camOn = track.enabled;
    connectSocket().emit('room:media', { micOn: track.enabled });
  }, []);

  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    connectSocket().emit('room:media', { camOn: track.enabled });
  }, []);

  const sendMessage = useCallback((text) => {
    connectSocket().emit('chat:message', { text });
  }, []);

  return {
    status, error, roomName, localStream, peers, micOn, camOn,
    toggleMic, toggleCam, screenStream, shareError, startShare, stopShare,
    selfId, messages, files, sendMessage,
  };
}