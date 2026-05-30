import { Camera, ImagePlus, Loader2, ScanLine, UploadCloud, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';
import IngredientBadge from '../components/ui/IngredientBadge';
import { detectIngredients, generateRecipes, getPantry, savePantry } from '../services/api';

function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas to Blob failed'));
            return;
          }
          const compressedFile = new File([blob], file.name || 'scan.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = (err) => {
      reject(err);
    };
  });
}

export default function ScanFridgePage({ pantry, setPantry, preferences, setRecipes, setSelectedRecipe, setPage, scanFile, setScanFile, scanPreview, setScanPreview, scanProgress, setScanProgress, scanResult, setScanResult, scanError, setScanError, scanLoading, setScanLoading }) {
  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => () => {
    if (scanPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(scanPreview);
    }
  }, [scanPreview]);

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    setCameraActive(false);
  }

  async function handleFile(nextFile) {
    if (!nextFile) return;
    
    if (scanPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(scanPreview);
    }
    
    const originalUrl = URL.createObjectURL(nextFile);
    setScanPreview(originalUrl);
    setScanFile(nextFile);
    setScanResult(null);
    setScanError('');
    setScanProgress(0);

    try {
      const compressed = await compressImage(nextFile, 1024, 1024, 0.85);
      setScanFile(compressed);
      
      const compressedUrl = URL.createObjectURL(compressed);
      setScanPreview(compressedUrl);
      
      URL.revokeObjectURL(originalUrl);
    } catch (err) {
      console.warn('Image compression failed, using original file:', err);
    }
  }

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (error) {
      setCameraError(error?.message || 'Camera access is unavailable on this device.');
      cameraRef.current?.click();
    }
  }

  function captureCameraFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `fridge-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handleFile(capturedFile);
      stopCamera();
    }, 'image/jpeg', 0.92);
  }

  function mergeDetectedPantry() {
    const detected = scanResult?.ingredients ?? [];
    const existing = pantry?.ingredients ?? [];
    const merged = new Map();
    const normalize = (name) => String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');

    for (const ingredient of existing) {
      merged.set(normalize(ingredient.name), ingredient);
    }

    for (const ingredient of detected) {
      const key = normalize(ingredient.name);
      const current = merged.get(key);
      if (!current) {
        merged.set(key, {
          id: crypto.randomUUID ? crypto.randomUUID() : `${key}-${Date.now()}`,
          name: ingredient.name,
          category: ingredient.category || 'other',
          quantity: 1,
          unit: 'item',
          confidence: ingredient.confidence ?? 0.5,
          source: 'vision',
          raw_label: ingredient.name,
        });
        continue;
      }

      merged.set(key, {
        ...current,
        category: current.category === 'other' ? ingredient.category || current.category : current.category,
        confidence: Math.max(Number(current.confidence || 0), Number(ingredient.confidence || 0)),
        source: current.source || 'vision',
      });
    }

    return Array.from(merged.values());
  }

  async function scan() {
    if (!scanFile) return;
    setScanLoading(true);
    setScanProgress(8);
    setScanError('');
    try {
      const data = await detectIngredients(scanFile, (event) => {
        if (event.total) setScanProgress(Math.round((event.loaded / event.total) * 65));
      });
      setScanResult(data);
      setScanProgress(100);
      setScanLoading(false);

      const foundAutoRecipeIngredient = data.ingredients?.some((ingredient) => {
        const name = ingredient.name.toLowerCase();
        return name.includes('tomato') || name.includes('chicken');
      });
      // Refresh pantry from the server in the background (prevent blocking UI reset)
      getPantry().then(setPantry).catch(() => {});
      if (foundAutoRecipeIngredient) {
        try {
          const recipeData = await generateRecipes({ ingredients: data.ingredients, preferences });
          setRecipes(recipeData.recipes);
          setSelectedRecipe(null);
          setPage('recipes');
        } catch (recipeError) {
          console.error('Auto-recipe generation failed:', recipeError);
        }
      }
    } catch (scanError) {
      setScanError(scanError?.response?.data?.detail || scanError?.message || 'Scan failed. Please try another image.');
      setScanProgress(0);
      setScanLoading(false);
    }
  }

  async function openPantry() {
    if (!scanResult?.ingredients?.length) return;
    const saved = await savePantry({ ingredients: mergeDetectedPantry() });
    setPantry(saved);
    setPage('pantry');
  }

  return (
    <div className="space-y-6">
      <AiChef message={scanLoading ? 'Scanning labels, colors, and fridge clues.' : 'Drop a fridge photo and I will sketch your pantry.'} />
      <div className="grid gap-6 lg:grid-cols-[1fr_.85fr]">
        <ComicCard className="bg-paper">
          <div
            onDrop={(event) => {
              event.preventDefault();
              handleFile(event.dataTransfer.files?.[0]);
            }}
            onDragOver={(event) => event.preventDefault()}
            className="grid min-h-[330px] place-items-center rounded-[28px] border-3 border-dashed border-ink bg-cream p-5 text-center"
          >
            {cameraActive ? (
              <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border-3 border-ink bg-black shadow-sticker">
                <video ref={videoRef} className="h-[320px] w-full object-cover" autoPlay playsInline muted />
                <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 bg-black/55 p-4 text-white backdrop-blur-sm">
                  <p className="font-hand text-xl">Frame the fridge and tap capture.</p>
                  <div className="flex flex-wrap gap-2">
                    <ComicButton variant="yellow" icon={ScanLine} onClick={captureCameraFrame}>Capture</ComicButton>
                    <ComicButton variant="paper" icon={X} onClick={stopCamera}>Close</ComicButton>
                  </div>
                </div>
              </div>
            ) : scanPreview ? (
              <img src={scanPreview} alt="Fridge preview" className="max-h-[320px] rounded-3xl border-3 border-ink object-cover shadow-sticker" />
            ) : (
              <div className="space-y-4">
                <UploadCloud className="mx-auto" size={72} strokeWidth={2.5} />
                <p className="font-display text-5xl text-tomato">Drop the fridge shot</p>
                <p className="font-hand text-2xl text-cocoa">Camera or upload both work nicely on mobile.</p>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <input ref={inputRef} className="hidden" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
            <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={(event) => handleFile(event.target.files?.[0])} />
            <ComicButton icon={ImagePlus} variant="yellow" onClick={() => inputRef.current?.click()}>Upload</ComicButton>
            <ComicButton icon={Camera} variant="green" onClick={startCamera}>Camera</ComicButton>
            <ComicButton icon={scanLoading ? Loader2 : UploadCloud} onClick={scan} disabled={!scanFile || scanLoading}>{scanLoading ? 'Scanning' : 'Scan Now'}</ComicButton>
          </div>
          {cameraError ? <p className="mt-3 font-hand text-xl text-tomato">{cameraError}</p> : null}
          {scanProgress > 0 ? (
            <div className="mt-5 h-5 overflow-hidden rounded-full border-3 border-ink bg-paper">
              <motion.div className="h-full bg-tomato" animate={{ width: `${scanProgress}%` }} />
            </div>
          ) : null}
          {scanError ? <p className="mt-4 font-hand text-xl text-tomato">{scanError}</p> : null}
        </ComicCard>
        <ComicCard>
          <h2 className="font-display text-5xl text-leaf">Detected Pantry</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {scanResult?.ingredients?.length ? scanResult.ingredients.map((ingredient, index) => <IngredientBadge key={`${ingredient.name}-${index}`} ingredient={ingredient} />) : <p className="font-hand text-2xl">Ingredient badges will pop here.</p>}
          </div>
          {scanResult ? (
            <div className="mt-5 rounded-[24px] border-3 border-ink bg-butter/40 p-4 shadow-sticker">
              <p className="font-doodle text-lg font-bold text-cocoa">Scan workflow</p>
              <p className="mt-2 font-hand text-xl text-cocoa">
                {scanResult.ingredients?.length ? 'Detection complete. The pantry is ready to import.' : 'No ingredients passed the confidence filter.'}
              </p>
              <p className="mt-2 font-body text-sm font-bold uppercase tracking-wide text-cocoa/80">
                {scanResult.ingredients?.length || 0} ingredient{scanResult.ingredients?.length === 1 ? '' : 's'} detected
              </p>
            </div>
          ) : null}
          {scanResult ? (
            <ComicButton className="mt-6 w-full" onClick={openPantry}>Open Pantry</ComicButton>
          ) : null}
        </ComicCard>
      </div>
    </div>
  );
}
