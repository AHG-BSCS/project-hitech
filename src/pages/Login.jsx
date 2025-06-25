import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useSystemSettings } from '../context/SystemSettingsContext';

export default function Login() {
  const [form, setForm] = useState({ employeeId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useSystemSettings();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const q = query(collection(db, 'users'), where('employeeId', '==', form.employeeId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMsg('Employee ID not found.');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0].data();
      const email = userDoc.email;

      await signInWithEmailAndPassword(auth, email, form.password);

      localStorage.setItem('employeeId', form.employeeId);
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/home');
    } catch (error) {
      console.error(error);
      setErrorMsg('Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (isAuthenticated) navigate('/dashboard');
  }, []);

  if (settingsLoading) return <div className="flex items-center justify-center h-screen">Loading system settings...</div>;

  // Login card location
  let justify = 'center';
  if (settings?.loginCardLocation === 'left') justify = 'start';
  if (settings?.loginCardLocation === 'right') justify = 'end';

  // Login page background
  let bgStyle = {};
  if (settings?.bgType === 'color') {
    bgStyle.background = settings.bgValue || '#f3f4f6';
  } else if (settings?.bgType === 'image' && settings.bgBase64) {
    bgStyle.background = `url(${settings.bgBase64}) center/cover no-repeat`;
  }

  return (
    <div className="min-h-screen flex items-center relative" style={bgStyle}>
      {/* Background blur overlay */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-md z-0"></div>
      <div className={`card w-full max-w-sm shadow-2xl bg-base-100 mx-auto flex-1 flex flex-col justify-${justify} relative z-10`}>
        <form className="card-body" onSubmit={handleSubmit}>
          <div className="w-full flex justify-center items-center my-2">
            <div className="flex items-center justify-center gap-2 bg-white rounded-full p-2 shadow-sm" style={{maxWidth:'120px'}}>
              {settings?.logoMode === 'school-deped' ? (
                <div className="flex items-center justify-center gap-2 w-full">
                  {settings?.logoBase64 && (
                    <img src={settings.logoBase64} alt="School Logo" className="w-12 h-12 rounded-full object-contain" />
                  )}
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Seal_of_the_Department_of_Education_of_the_Philippines.png"
                    alt="DepEd Logo"
                    className="w-12 h-12 rounded-full object-contain"
                  />
                </div>
              ) : settings?.logoBase64 ? (
                <img src={settings.logoBase64} alt="School Logo" className="w-25 h-25 rounded-full object-contain" />
              ) : (
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Seal_of_the_Department_of_Education_of_the_Philippines.png" alt="DepEd Logo" className="w-12 h-12 rounded-full object-contain" />
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center">{settings?.titleBar || 'School Portal'}</h2>
          <p className="text-sm text-center">{settings?.division ? `Division of ${settings.division}` : 'Division'}</p>
          <p className="text-xs text-center">School ID: {settings?.schoolId || '109768'}</p>

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
                
              </button>
            </div>
          </div>

          {errorMsg && <div className="text-red-500 text-center">{errorMsg}</div>}

          <div className="form-control mt-4">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <span className="loading loading-spinner"></span> : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}