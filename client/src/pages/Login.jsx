import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Login() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to join your meetings."
      footer={<>New here? <Link to="/register" className="text-accent hover:underline">Create an account</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} required />
        <Input label="Password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={onChange} required />
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-danger" role="alert">
            {error}
          </motion.p>
        )}
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
      </form>
    </AuthLayout>
  );
}