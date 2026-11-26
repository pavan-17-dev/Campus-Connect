import AuthLayout from '../components/AuthLayout';
import LoginForm from '../components/LoginForm';

export default function Login() {
  return (
    <AuthLayout title="Welcome back 👋" subtitle="Log in to buy, sell and chat with students on your campus.">
      <LoginForm />
    </AuthLayout>
  );
}
