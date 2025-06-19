import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [form, setForm] = useState({ employeeId: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { employeeId, password } = form;

    if (form.employeeId === 'admin' && form.password === 'admin') {
      localStorage.setItem('isAuthenticated', 'true');
      setLoading(false);
      window.location.href = '/dashboard';
    } else {
      setLoading(false);
      setErrorMsg('Invalid ID or password.');
    }
  };

  return (
    <div className="bg-base-200 min-h-screen flex items-center justify-center">
      <div className="card w-full max-w-sm shadow-2xl bg-base-100">
        <form className="card-body" onSubmit={handleSubmit}>
          <div className="avatar mx-auto">
            <div className="w-24 rounded-full">
              <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Seal_of_the_Department_of_Education_of_the_Philippines.png" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center">School Portal</h2>
          <p className="text-sm text-center">Division of San Pablo</p>
          <p className="text-xs text-center">School ID: 109768</p>

          <div className="form-control">
            <label className="label">Employee ID</label>
            <input
              type="text"
              name="employeeId"
              className="input input-bordered"
              placeholder="Enter your ID"
              value={form.employeeId}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-control">
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="input input-bordered w-full pr-10"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2"
              >
                {/* Eye Icon Here */}
                👁️
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-red-500 text-center mb-2">{errorMsg}</div>
          )}

          <div className="form-control mt-4">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <span className="loading loading-spinner"></span>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}