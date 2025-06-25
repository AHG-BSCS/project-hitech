import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
        let quality = 0.92;
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        let dataUrl;
        let step = 0;
        do {
          // Scale down if too large
          let scale = Math.sqrt((maxBytes / (file.size || 1)) * 0.9);
          if (scale < 1) {
            w = Math.floor(img.width * scale);
            h = Math.floor(img.height * scale);
          }
          canvas.width = w;
          canvas.height = h;
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          // Reduce quality if still too large
          if (dataUrl.length * 0.75 > maxBytes) {
            quality -= 0.05;
            if (quality < 0.5) break;
          } else {
            break;
          }
          step++;
        } while (step < 10);
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
  // Track if logo or bg was changed
  const [logoChanged, setLogoChanged] = useState(false);
  const [bgChanged, setBgChanged] = useState(false);

  useEffect(() => {
    // Load settings from Firestore
    const fetchSettings = async () => {
      const docRef = doc(db, 'system', 'settings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitleBar(data.titleBar || '');
        setColorPalette(data.colorPalette || '#2563eb');
        setSchoolId(data.schoolId || '');
        setLogoBase64(data.logoBase64 || '');
        setLogoMode(data.logoMode || 'school');
        setBgType(data.bgType || 'color');
        setBgValue(data.bgValue || '#f3f4f6');
        setBgBase64(data.bgBase64 || '');
        setDivision(data.division || '');
        setRegion(data.region || '');
        setLogoChanged(false);
        setBgChanged(false);
      }
    };
    fetchSettings();
  }, []);

  const handleLogoChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setLogo(e.target.files[0]);
      const base64 = await fileToBase64Scaled(e.target.files[0]);
      setLogoBase64(base64);
      setLogoChanged(true);
    }
  };

  const handleBgChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setBgValue(e.target.files[0]);
      const base64 = await fileToBase64Scaled(e.target.files[0]);
      setBgBase64(base64);
      setBgChanged(true);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    // Check if base64 images are under 1MB
    if (logoChanged && logoBase64 && logoBase64.length * 0.75 > 1000000) {
      setError('Logo image is too large after scaling. Please use a smaller image.');
      setLoading(false);
      return;
    }
    if (bgType === 'image' && bgChanged && bgBase64 && bgBase64.length * 0.75 > 1000000) {
      setError('Background image is too large after scaling. Please use a smaller image.');
      setLoading(false);
      return;
    }
    // Prepare data to save
    const docRef = doc(db, 'system', 'settings');
    const docSnap = await getDoc(docRef);
    let prevLogoBase64 = logoBase64;
    let prevBgBase64 = bgBase64;
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (!logoChanged) prevLogoBase64 = data.logoBase64 || '';
      if (!bgChanged) prevBgBase64 = data.bgBase64 || '';
    }
    await setDoc(docRef, {
      titleBar,
      colorPalette,
      schoolId,
      logoBase64: prevLogoBase64,
      logoMode,
      bgType,
      bgValue: bgType === 'color' ? bgValue : '',
      bgBase64: bgType === 'image' ? prevBgBase64 : '',
      division,
      region,
    });
    setLoading(false);
    setSuccess(true);
    setLogoChanged(false);
    setBgChanged(false);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <Section title="Portal Settings">
        <form className="space-y-6" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          {/* Title Bar */}
          <div>
            <label className="block font-medium mb-1">System Title Bar</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={titleBar}
              onChange={e => setTitleBar(e.target.value)}
              placeholder="Enter system title bar text"
            />
          </div>
          {/* Color Palette */}
          <div>
            <label className="block font-medium mb-1">Color Palette</label>
            <input
              type="color"
              className="w-16 h-10 p-0 border-none"
              value={colorPalette}
              onChange={e => setColorPalette(e.target.value)}
            />
          </div>
          {/* School ID */}
          <div>
            <label className="block font-medium mb-1">School ID</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value)}
              placeholder="Enter School ID"
            />
          </div>
          {/* Division */}
          <div>
            <label className="block font-medium mb-1">Division</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={division}
              onChange={e => setDivision(e.target.value)}
              placeholder="Enter Division"
            />
          </div>
          {/* Region */}
          <div>
            <label className="block font-medium mb-1">Region</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={region}
              onChange={e => setRegion(e.target.value)}
              placeholder="Enter Region"
            />
          </div>
          {/* School Logo */}
          <div>
            <label className="block font-medium mb-1">School Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
            />
            {(logoBase64) && (
              <img
                src={logoBase64}
                alt="School Logo Preview"
                className="mt-2 h-16 rounded border"
              />
            )}
          </div>
          {/* Logo Display Mode */}
          <div>
            <label className="block font-medium mb-1">Logo Display</label>
            <select
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                  onChange={() => setBgType('color')}
                />
                Color
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="bgType"
                  value="image"
                  checked={bgType === 'image'}
                  onChange={() => setBgType('image')}
                />
                Image
              </label>
            </div>
            {bgType === 'color' ? (
              <input
                type="color"
                className="w-16 h-10 p-0 border-none"
                value={typeof bgValue === 'string' ? bgValue : '#f3f4f6'}
                onChange={e => setBgValue(e.target.value)}
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleBgChange}
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
          {/* Save Button */}
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
          {success && <div className="text-green-600 font-semibold">Settings saved!</div>}
          {error && <div className="text-red-600 font-semibold">{error}</div>}
        </form>
      </Section>
    </div>
  );
};

export default PortalSettings;
