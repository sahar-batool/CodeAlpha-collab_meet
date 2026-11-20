import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Register() {
  const { user, register } = useAuth();
  const from = useLocation().state?.from?.pathname || '/lobby';
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err) {
      // The server sends validation errors as [{ field, message }].
      if (err.errors?.length) {
        setFieldErrors(Object.fromEntries(err.errors.map((x) => [x.field, x.message])));
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={<>Already have an account? <Link to="/login" className="text-accent hover:underline">Log in</Link></>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Name" name="name" autoComplete="name" value={form.name} onChange={onChange} error={fieldErrors.name} required />
        <Input label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} error={fieldErrors.email} required />
        <Input label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={onChange} error={fieldErrors.password} required />
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-danger" role="alert">
            {error}
          </motion.p>
        )}
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
      </form>
    </AuthLayout>
  );
}