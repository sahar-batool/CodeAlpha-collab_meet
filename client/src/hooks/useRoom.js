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

export function useRoom(code) {
  const [status, setStatus] = useState('joining'); // joining | joined | error
  const [error, setError] = useState('');
  const [roomName, setRoomName] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState({}); // socketId -> { name, stream }
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const localRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const socket = connectSocket();
    const pcs = new Map(); // socketId -> RTCPeerConnection
    const queues = new Map(); // socketId -> promise chain, keeps signals in order

    const fail = (message) => {
      if (cancelled) return;
      setError(message);
      setStatus('error');
      localRef.current?.getTracks().forEach((t) => t.stop());
    };

    const createPeer = (id, name, initiator) => {
      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcs.set(id, pc);

      const local = localRef.current;
      local.getTracks().forEach((t) => pc.addTrack(t, local));
      // If we have no camera or mic, still be able to receive theirs.
      if (!local.getVideoTracks().length) pc.addTransceiver('video', { direction: 'recvonly' });
      if (!local.getAudioTracks().length) pc.addTransceiver('audio', { direction: 'recvonly' });

      pc.onicecandidate = (e) => {
        if (e.candidate) socket.emit('signal', { to: id, data: { candidate: e.candidate } });
      };
      pc.ontrack = (e) =>
        setPeers((p) => (p[id] ? { ...p, [id]: { ...p[id], stream: e.streams[0] } } : p));

      setPeers((p) => ({ ...p, [id]: { name, stream: null } }));

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
      queues.delete(id);
      setPeers((p) => {
        const { [id]: _gone, ...rest } = p;
        return rest;
      });
    };

    const handleSignal = async (from, data) => {
      const pc = pcs.get(from);
      if (!pc || !data) return;
      if (data.description) {
        await pc.setRemoteDescription(data.description);
        if (data.description.type === 'offer') {
          await pc.setLocalDescription(await pc.createAnswer());
          socket.emit('signal', { to: from, data: { description: pc.localDescription } });
        }
      } else if (data.candidate) {
        await pc.addIceCandidate(data.candidate);
      }
    };

    // Handle each peer's signals one at a time, in the order they arrived.
    const onSignal = ({ from, data }) => {
      const prev = queues.get(from) ?? Promise.resolve();
      queues.set(from, prev.then(() => handleSignal(from, data)).catch(console.error));
    };

    const onPeerJoined = ({ id, name }) => createPeer(id, name, false);
    const onPeerLeft = ({ id }) => removePeer(id);
    const onDisconnect = () => fail('The connection to the server was lost. Refresh to rejoin.');
    const onConnectError = (e) =>
      fail(e.message === 'unauthorized' ? 'Your session expired. Please log in again.' : 'Could not reach the server.');

    socket.on('room:peer-joined', onPeerJoined);
    socket.on('room:peer-left', onPeerLeft);
    socket.on('signal', onSignal);
    socket.on('disconnect', onDisconnect);
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
      localRef.current = stream;
      setLocalStream(stream);
      setCamOn(stream.getVideoTracks().length > 0);

      socket.timeout(8000).emit('room:join', { code }, (err, res) => {
        if (cancelled) return;
        if (err) return fail('The server did not respond. Please try again.');
        if (res.error) return fail(res.error);
        setRoomName(res.room.name);
        setStatus('joined');
        // We are the newcomer, so we make the offers.
        res.peers.forEach((p) => createPeer(p.id, p.name, true));
      });
    })();

    return () => {
      cancelled = true;
      socket.off('room:peer-joined', onPeerJoined);
      socket.off('room:peer-left', onPeerLeft);
      socket.off('signal', onSignal);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.emit('room:leave');
      pcs.forEach((pc) => pc.close());
      pcs.clear();
      queues.clear();
      localRef.current?.getTracks().forEach((t) => t.stop());
      localRef.current = null;
      setLocalStream(null);
      setPeers({});
      setStatus('joining');
      setError('');
    };
  }, [code]);

  const toggleMic = useCallback(() => {
    const track = localRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCam = useCallback(() => {
    const track = localRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  return { status, error, roomName, localStream, peers, micOn, camOn, toggleMic, toggleCam };
}