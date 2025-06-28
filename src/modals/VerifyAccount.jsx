import { useEffect, useState } from 'react';
import { signOut, sendPasswordResetEmail, getAuth } from 'firebase/auth';
import { auth } from '../firebase';

export default function VerifyAccount({ show, onClose, email }) {
  const [emailSent, setEmailSent] = useState(false);
  useEffect(() => {
    if (show && email && !emailSent) {
      const sendReset = async () => {
        try {
          await sendPasswordResetEmail(getAuth(), email);
          setEmailSent(true);
        } catch (err) {
          // Optionally handle error
        }
      };
      sendReset();
    }
  }, [show, email, emailSent]);

  if (!show) return null;

  const handleLogout = async () => {
    await signOut(auth);
    onClose();
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold text-center text-red-600 mb-4">Verify Your Account</h2>
        <p className="text-sm text-center mb-4 text-gray-700">
          Please check your email and reset your password. For your security, you can't continue with the default password.
        </p>
        {emailSent && (
          <p className="text-green-600 text-center mb-2">A password reset email has been sent to {email}.</p>
        )}
        <div className="flex justify-center gap-4">
          <button onClick={handleLogout} className="btn bg-error text-white btn-outline">Log Out</button>
        </div>
      </div>
    </div>
  );
}