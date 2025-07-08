import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

function Section({ title, children }) {
  return (
    <section className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mb-8">
      <h2 className="text-xl font-bold text-black mb-4">{title}</h2>
      {children}
    </section>
  );
}

// Resize image to fit under maxBytes (default 500KB)
const fileToBase64Scaled = (file, maxBytes = 500 * 1024) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        let [w, h] = [img.width, img.height];
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let dataUrl;
        let step = 0;
        let scale = 1;
        do {
          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          dataUrl = canvas.toDataURL('image/png');
          // If still too large, reduce dimensions
          if (dataUrl.length * 0.75 > maxBytes) {
            scale = Math.sqrt(maxBytes / (dataUrl.length * 0.75));
            w = Math.max(1, Math.floor(w * scale));
            h = Math.max(1, Math.floor(h * scale));
          } else {
            break;
          }
          step++;
        } while (step < 20); // allow more steps for aggressive downscaling
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const PortalSettings = () => {
  const [titleBar, setTitleBar] = useState('');
  const [colorPalette, setColorPalette] = useState('#2563eb');
  const [schoolId, setSchoolId] = useState('');
  const [logo, setLogo] = useState(null);
  const [logoBase64, setLogoBase64] = useState('');
  const [logoSvg, setLogoSvg] = useState('');
  const [logoMode, setLogoMode] = useState('school');
  const [loginCardLocation, setLoginCardLocation] = useState('center');
  const [bgType, setBgType] = useState('color');
  const [bgValue, setBgValue] = useState('#f3f4f6');
  const [bgBase64, setBgBase64] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [division, setDivision] = useState('');
  const [region, setRegion] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [district, setDistrict] = useState('');
  // Track if logo or bg was changed
  const [logoChanged, setLogoChanged] = useState(false);
  const [bgChanged, setBgChanged] = useState(false);
  // Account Defaults
  const [userDefaultPassword, setUserDefaultPassword] = useState('');
  const [userDefaultPasswordPlain, setUserDefaultPasswordPlain] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const fetchSettings = async () => {
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setTitleBar(data.titleBar || '');
      setColorPalette(data.colorPalette || '#2563eb');
      setSchoolId(data.schoolId || '');
      setLogoBase64(data.logoBase64 || '');
      setLogoSvg(data.logoSvg || '');
      setLogoMode(data.logoMode || 'school');
      setDivision(data.division || '');
      setRegion(data.region || '');
      setSchoolName(data.schoolName || '');
      setSchoolAddress(data.schoolAddress || '');
      setContactNumber(data.contactNumber || '');
      setPrincipalName(data.principalName || '');
      setDistrict(data.district || '');
      setUserDefaultPassword(data.userDefaultPassword || '');
      setUserDefaultPasswordPlain(''); // never load plaintext from db
      setLogoChanged(false);
      setBgChanged(false);
    }

    // Fetch background settings from system/bgSettings
    const bgSettingsRef = doc(db, 'system', 'bgSettings');
    const bgSettingsSnap = await getDoc(bgSettingsRef);
    if (bgSettingsSnap.exists()) {
      const bgData = bgSettingsSnap.data();
      setBgType(bgData.bgType || 'color');
      setBgValue(bgData.bgValue || '');
    }
    // If background is image, load from separate doc
    if ((bgSettingsSnap.data()?.bgType || 'color') === 'image') {
      const bgDocRef = doc(db, 'system', 'bgImage');
      const bgDocSnap = await getDoc(bgDocRef);
      setBgBase64(bgDocSnap.exists() ? bgDocSnap.data().bgBase64 || '' : '');
    } else {
      setBgBase64('');
    }
  };

  useEffect(() => {
    // Load settings from Firestore
    fetchSettings();
  }, []);

  const handleLogoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      if (file.type === 'image/svg+xml') {
        // Read SVG as text
        const reader = new FileReader();
        reader.onload = (ev) => {
          setLogoSvg(ev.target.result);
          setLogoBase64('');
          setLogoChanged(true);
        };
        reader.readAsText(file);
      } else {
        const base64 = await fileToBase64Scaled(file);
        setLogoBase64(base64);
        setLogoSvg('');
        setLogoChanged(true);
      }
    }
  };

  const handleBgChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const base64 = await fileToBase64Scaled(file);
      setBgBase64(base64);
      setBgChanged(true);
    }
  };  

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    
    if (value.startsWith(' ')) {
        return;
    }

    setUserDefaultPasswordPlain(value);
  
    const trimmed = value.trim();
    if (trimmed === '') {
        setPasswordError('');
    } else if (trimmed && trimmed.length < 6) {
        setPasswordError('Password must be at least 6 characters.');
    } else {
        setPasswordError('');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    // Check SVG size if SVG is used
    if (logoChanged && logoSvg && new Blob([logoSvg]).size > 500 * 1024) {
      setError('SVG logo is too large. Please use an SVG under 500KB.');
      setLoading(false);
      return;
    }
    // Check base64 image size if not SVG
    if (logoChanged && logoBase64 && logoBase64.length * 0.75 > 500 * 1024) {
      setError('Logo image is too large after scaling. Please use an image under 500KB.');
      setLoading(false);
      return;
    }
    if (bgType === 'image' && bgChanged && bgBase64 && bgBase64.length * 0.75 > 1000000) {
      setError('Background image is too large after scaling. Please use a smaller image.');
      setLoading(false);
      return;
    }
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    let prevLogoBase64 = logoBase64;
    let prevLogoSvg = logoSvg;
    let prevBgBase64 = bgBase64;
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!logoChanged) {
        prevLogoBase64 = data.logoBase64 || '';
        prevLogoSvg = data.logoSvg || '';
      }
      if (!bgChanged && data.bgType === 'image') {
        // If not changed and image, load from bgImage doc
        const bgDocRef = doc(db, 'system', 'bgImage');
        const bgDocSnap = await getDoc(bgDocRef);
        prevBgBase64 = bgDocSnap.exists() ? bgDocSnap.data().bgBase64 || '' : '';
      } else if (!bgChanged) {
        prevBgBase64 = data.bgBase64 || '';
      }
    }
    // Save background image in separate doc if type is image
    if (bgType === 'image' && (bgChanged || !bgBase64)) {
      const bgDocRef = doc(db, 'system', 'bgImage');
      await setDoc(bgDocRef, { bgBase64: bgBase64 });
    }
    // Save background settings in system/bgSettings
    const bgSettingsRef = doc(db, 'system', 'bgSettings');
    await setDoc(bgSettingsRef, {
      bgType,
      bgValue: bgType === 'color' ? bgValue : '',
    });
    // Save other settings in system/settings (without bgType/bgValue/bgBase64)
    let passwordToSave = userDefaultPassword;
    let passwordPlainToSave = userDefaultPasswordPlain.trim();
    if (passwordPlainToSave) {
      if (passwordPlainToSave.length < 6) {
        setError('Default password must be at least 6 characters.');
        setTimeout(() => setError(''), 2000);
        setLoading(false);
        return;
      }
      const salt = await bcrypt.genSalt(10);
      passwordToSave = await bcrypt.hash(passwordPlainToSave, salt);
      passwordPlainToSave = passwordPlainToSave;
    }
    if (userDefaultPasswordPlain.trim() === '') {
      await setDoc(doc(db, 'system', 'settings'), {
        titleBar,
        colorPalette,
        schoolId,
        logoBase64,
        logoSvg,
        logoMode,
        division,
        region,
        schoolName,
        schoolAddress,
        contactNumber,
        principalName,
        district,
      }, { merge: true });
    }
    else {
      await setDoc(doc(db, 'system', 'settings'), {
        titleBar,
        colorPalette,
        schoolId,
        logoBase64,
        logoSvg,
        logoMode,
        division,
        region,
        schoolName,
        schoolAddress,
        contactNumber,
        principalName,
        district,
        userDefaultPassword: passwordToSave,
        userDefaultPasswordPlaintext: passwordPlainToSave,
      }, { merge: true });
    }
    setLoading(false);
    setSuccess(true);
    setLogoChanged(false);
    setBgChanged(false);
    setUserDefaultPasswordPlain('');
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="max-w-fill mx-auto">
      {/* School Details Section */}
      <Section title="School Details">
        <form className="space-y-6 text-black" onSubmit={e => e.preventDefault()}>
          {/* School Name */}
          <div>
            <label className="block font-medium mb-1">School Name</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter School Name"
              value={schoolName || ''}
              onChange={e => setSchoolName(e.target.value)}
            />
          </div>
          {/* School ID */}
          <div>
            <label className="block font-medium mb-1">School ID</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter School ID"
              value={schoolId || ''}
              onChange={e => setSchoolId(e.target.value)}
            />
          </div>
          {/* School Address */}
          <div>
            <label className="block font-medium mb-1">School Address</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter School Address"
              value={schoolAddress || ''}
              onChange={e => setSchoolAddress(e.target.value)}
            />
          </div>
          {/* Contact Number */}
          <div>
            <label className="block font-medium mb-1">Contact Number</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter Contact Number"
              value={contactNumber || ''}
              onChange={e => setContactNumber(e.target.value)}
            />
          </div>
          {/* Principal Name */}
          <div>
            <label className="block font-medium mb-1">Principal Name</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter Principal Name"
              value={principalName || ''}
              onChange={e => setPrincipalName(e.target.value)}
            />
          </div>
          {/* Division Office */}
          <div>
            <label className="block font-medium mb-1">Division Office</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter Division Office"
              value={division || ''}
              onChange={e => setDivision(e.target.value)}
            />
          </div>
          {/* District */}
          <div>
            <label className="block font-medium mb-1">District</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter District"
              value={district || ''}
              onChange={e => setDistrict(e.target.value)}
            />
          </div>
          {/* Region */}
          <div>
            <label className="block font-medium mb-1">Region</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter Region"
              value={region || ''}
              onChange={e => setRegion(e.target.value)}
            />
          </div>
          {/* School Logo */}
          <div>
            <label className="block font-medium mb-1">School Logo</label>
            <input
              type="file"
              accept="image/*,.svg"
              onChange={handleLogoChange}
              className="bg-white text-sm file:border file:border-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white file:text-gray-700"
            />
            {(logoSvg) && (
              <div className="mt-2 h-16 rounded border bg-white flex items-center justify-center" style={{height:'4rem'}}>
                <div dangerouslySetInnerHTML={{ __html: logoSvg }} style={{height:'100%'}} />
              </div>
            )}
            {(!logoSvg && logoBase64) && (
              <img
                src={logoBase64}
                alt="School Logo Preview"
                className="mt-2 h-16 rounded border"
              />
            )}
          </div>
        </form>
      </Section>
      {/* Account Defaults Section */}
      <Section title="Account Defaults">
        <form className="space-y-6 text-black" onSubmit={e => e.preventDefault()}>
          <div>
            <label className="block font-medium mb-1">User Default Password</label>
           
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Enter default password for new users"
              value={userDefaultPasswordPlain}
              onChange={handlePasswordChange}
            />
            {passwordError && (
              <p className="text-red-500 text-sm mt-1">{passwordError}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">This password will be assigned to new users in Manage Users. (Current hash: {userDefaultPassword ? 'Set' : 'Not set'})</p>
          </div>
        </form>
      </Section>
      {/* Portal Settings Section */}
      <Section title="Portal Settings">
        <form className="space-y-6 text-black" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          {/* Title Bar */}
          <div>
            <label className="block font-medium mb-1">System Title Bar</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={titleBar || ''}
              onChange={e => setTitleBar(e.target.value)}
              placeholder="Enter system title bar text"
            />
          </div>
          {/* Color Palette */}
          <div>
            <label className="block font-medium mb-1">Color Palette</label>
            <input
              type="color"
              className="w-16 h-10 p-0 border border-gray-300 bg-white"
              value={colorPalette || '#f3f4f6'}
              onChange={e => setColorPalette(e.target.value)}
            />
          </div>
          {/* Logo Display Mode */}
          <div>
            <label className="block font-medium mb-1">Logo Display</label>
            <select
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={logoMode}
              onChange={e => setLogoMode(e.target.value)}
            >
              <option value="school">Show School Logo Only</option>
              <option value="school-deped">Show School Logo with DepEd</option>
            </select>
          </div>
          {/* Login Page Background */}
          <div>
            <label className="block font-medium mb-1">Login Page Background</label>
            <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-1">
            <input
              type="radio"
              name="bgType"
              value="color"
              checked={bgType === 'color'}
              onChange={() => {
                setBgType('color');
                setBgValue('#f3f4f6');
              }}
            />
            Color
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="bgType"
              value="image"
              checked={bgType === 'image'}
              onChange={() => {
                setBgType('image');
                setBgValue('');
              }}
            />
            Image
          </label>
            </div>
            {bgType === 'color' ? (
              <input
                type="color"
                className="w-16 h-10 p-0 border-none"
                value={/^#[0-9A-Fa-f]{6}$/.test(bgValue) ? bgValue : '#f3f4f6'}
                onChange={e => setBgValue(e.target.value)}
              />       
            ) : (
              <input
                type="file"
                accept="image/*"
                value={''}
                onChange={handleBgChange}
                className="bg-white text-sm file:border file:border-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-white file:text-gray-700"
              />
            )}
            {bgType === 'image' && bgBase64 && (
              <img
                src={bgBase64}
                alt="Background Preview"
                className="mt-2 h-16 rounded border"
              />
            )}
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => { fetchSettings(); }}
              className="btn bg-gray-300 hover:bg-gray-400 text-black"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Settings' }
            </button>
          </div>
          
          {success && <div className="text-green-600 font-semibold">Settings saved!</div>}
          {error && <div className="text-red-600 font-semibold">{error}</div>}
        </form>
      </Section>
    </div>
  );
};

export default PortalSettings;
