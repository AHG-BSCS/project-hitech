import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { updateDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useSystemSettings } from '../context/SystemSettingsContext';
import VerifyAccount from '../modals/VerifyAccount';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import depedLogo from '../img/logo_dpd.png';

// Cache keys (move above component)
const BG_IMAGE_KEY = 'cachedBgImage';
const BG_SETTINGS_KEY = 'cachedBgSettings';
const LOGO_KEY = 'cachedLogoBase64';
const LOGO_MODE_KEY = 'cachedLogoMode';

function LockedModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h2 className="text-lg font-bold mb-4 text-red-600">Account Locked</h2>
        <p className="mb-4">Your account has been locked. Please contact your administrator for more information.</p>
        <div className="flex justify-end">
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  const [form, setForm] = useState({ employeeId: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useSystemSettings();
  const [bgImage, setBgImage] = useState(() => {
    const cached = localStorage.getItem(BG_IMAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [bgSettings, setBgSettings] = useState(() => {
    const cached = localStorage.getItem(BG_SETTINGS_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [fetching, setFetching] = useState(false);
  const fetchedOnce = useRef(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showLockedModal, setShowLockedModal] = useState(false);

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
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      if (userData.isLocked) {
        setShowLockedModal(true);
        setLoading(false);
        return;
      }
      const email = userData.email;
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, form.password);

      const loggedInUser = auth.currentUser;
      const userRef = doc(db, 'users', loggedInUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().defaultPassword === true) {
        if (form.password !== 'hitech123') {
          await updateDoc(doc(db, 'users', querySnapshot.docs[0].id), {
            defaultPassword: false,
          });
          localStorage.setItem('employeeId', form.employeeId);
          localStorage.setItem('isAuthenticated', 'true');
          navigate('/home');
        } else {
          await sendPasswordResetEmail(auth, email);
          setShowVerifyModal(true);
        }
      } else {
        localStorage.setItem('employeeId', form.employeeId);
        localStorage.setItem('isAuthenticated', 'true');
        navigate('/home');
      }
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

  // Fetch background and settings from Firestore, update cache if changed
  useEffect(() => {
    if (fetchedOnce.current) return;
    setFetching(true);
    const fetchBg = async () => {
      try {
        const [bgImageDoc, bgSettingsDoc] = await Promise.all([
          getDoc(doc(db, 'system', 'bgImage')),
          getDoc(doc(db, 'system', 'bgSettings')),
        ]);
        if (bgImageDoc.exists()) {
          const bgBase64 = bgImageDoc.data().bgBase64 || null;
          setBgImage(bgBase64);
          localStorage.setItem(BG_IMAGE_KEY, JSON.stringify(bgBase64));
        }
        if (bgSettingsDoc.exists()) {
          const data = bgSettingsDoc.data();
          setBgSettings(data);
          localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(data));
        }
      } catch (err) {
        console.error('Failed to fetch bgImage or bgSettings:', err);
      } finally {
        setFetching(false);
        fetchedOnce.current = true;
      }
    };
    fetchBg();
  }, []);

  // Cache logo if available
  useEffect(() => {
    if (settings?.logoBase64) {
      const cachedLogo = localStorage.getItem(LOGO_KEY);
      const cachedLogoMode = localStorage.getItem(LOGO_MODE_KEY);
      if (cachedLogo !== settings.logoBase64 || cachedLogoMode !== settings.logoMode) {
        localStorage.setItem(LOGO_KEY, settings.logoBase64);
        localStorage.setItem(LOGO_MODE_KEY, settings.logoMode);
      }
      setLogoLoaded(true);
    } else if (settings) {
      setLogoLoaded(true);
    }
  }, [settings]);

  // Login card location
  let justify = 'center';
  if (settings?.loginCardLocation === 'left') justify = 'start';
  if (settings?.loginCardLocation === 'right') justify = 'end';

  // Login page background (use cached, fallback to default)
  let bgStyle = {};
  if (bgSettings) {
    if (bgSettings.bgType === 'color') {
      bgStyle.background = bgSettings.bgValue || '#f3f4f6';
    } else if (bgSettings.bgType === 'image' && bgImage) {
      bgStyle.background = `url(${bgImage}) center/cover no-repeat`;
    }
  } else if (settings?.bgType === 'color') {
    bgStyle.background = settings.bgValue || '#f3f4f6';
  } else if (settings?.bgType === 'image' && bgImage) {
    bgStyle.background = `url(${bgImage}) center/cover no-repeat`;
  } else {
    bgStyle.background = '#f3f4f6'; // fallback
  }

  return (
    <div className="min-h-screen flex items-center relative" style={bgStyle}>
      {/* Background blur overlay */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-md z-0"></div>
      <div className={`card w-full bg-white max-w-sm shadow-2xl bg-base-100 mx-auto flex-1 flex flex-col justify-${justify} relative z-10`}>
        <form className="card-body" onSubmit={handleSubmit}>
          <div className="w-full flex justify-center items-center my-2">
            <div className="flex items-center justify-center gap-2 bg-white rounded-full p-2 shadow-sm" style={{maxWidth:'120px'}}>
              {settings?.logoMode === 'school-deped' ? (
                <div className="flex items-center justify-center gap-2 w-full">
                  {settings?.logoBase64 && (
                    <img src={settings.logoBase64} alt="School Logo" className="w-12 h-12 rounded-full object-contain" />
                  )}
                  <img
                    src={depedLogo}
                    alt="DepEd Logo"
                    className="w-12 h-12 rounded-full object-contain"
                  />
                </div>
              ) : settings?.logoBase64 ? (
                <img src={settings.logoBase64} alt="School Logo" className="w-25 h-25 rounded-full object-contain" />
              ) : (
                <img src={depedLogo} alt="DepEd Logo" className="w-12 h-12 rounded-full object-contain" />
              )}
            </div>
          </div>

          <h2 className="text-2xl text-black font-bold text-center">{settings?.titleBar || 'School Portal'}</h2>
          <p className="text-sm text-black text-center">{settings?.division ? `Division of ${settings.division}` : 'Division'}</p>
          <p className="text-xs text-black text-center">School ID: {settings?.schoolId || '109768'}</p>

          <div className="form-control">
            <label className="label text-black">Employee ID</label>
            <input
              type="text"
              name="employeeId"
              className="input input-bordered bg-white text-black border-gray-300 w-full"
              placeholder="Enter your ID"
              value={form.employeeId}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-control">
            <label className="label text-black">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                className="input input-bordered bg-white text-black border-gray-300 w-full pr-10"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {errorMsg && <div className="text-red-500 text-center">{errorMsg}</div>}

          <div className="form-control flex justify-end mt-4">
            <button type="submit" className="btn btn-primary">
              {loading ? <span className="loading loading-spinner"></span> : 'Login'}
            </button>
          </div>
        </form>
      </div>
      <VerifyAccount show={showVerifyModal} onClose={() => setShowVerifyModal(false)} />
      <LockedModal open={showLockedModal} onClose={() => setShowLockedModal(false)} />
    </div>
  );
}