import AuthLayout from '../components/AuthLayout';
import RegisterForm from '../components/RegisterForm';

export default function Register() {
  return (
    <AuthLayout title="Create your account" subtitle="Join your campus marketplace using your student credentials.">
      <RegisterForm />
    </AuthLayout>
  );
}
