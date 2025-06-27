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
        setLogoSvg(data.logoSvg || '');
        setLogoMode(data.logoMode || 'school');
        setDivision(data.division || '');
        setRegion(data.region || '');
        setLogoChanged(false);
        setBgChanged(false);
      }

      // Fetch background settings from system/bgSettings
      const bgSettingsRef = doc(db, 'system', 'bgSettings');
      const bgSettingsSnap = await getDoc(bgSettingsRef);
      if (bgSettingsSnap.exists()) {
        const bgData = bgSettingsSnap.data();
        setBgType(bgData.bgType || 'color');
        setBgValue(bgData.bgValue || '#f3f4f6');
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
      setBgValue(e.target.files[0]);
      const base64 = await fileToBase64Scaled(e.target.files[0]);
      setBgBase64(base64);
      setBgChanged(true);
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
    await setDoc(doc(db, 'system', 'settings'), {
      titleBar,
      colorPalette,
      schoolId,
      logoBase64,
      logoSvg,
      logoMode,
      division,
      region,
    }, { merge: true });
    setLoading(false);
    setSuccess(true);
    setLogoChanged(false);
    setBgChanged(false);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <Section title="Portal Settings">
        <form className="space-y-6 text-black" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          {/* Title Bar */}
          <div>
            <label className="block font-medium mb-1">System Title Bar</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              className="w-16 h-10 p-0 border border-gray-300 bg-white"
              value={colorPalette}
              onChange={e => setColorPalette(e.target.value)}
            />
          </div>
          {/* School ID */}
          <div>
            <label className="block font-medium mb-1">School ID</label>
            <input
              type="text"
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
              className="w-full border bg-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
