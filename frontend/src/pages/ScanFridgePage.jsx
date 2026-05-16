import { Camera, ImagePlus, Loader2, UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import AiChef from '../components/ai/AiChef';
import ComicButton from '../components/ui/ComicButton';
import ComicCard from '../components/ui/ComicCard';
import IngredientBadge from '../components/ui/IngredientBadge';
import { detectIngredients, getPantry } from '../services/api';

export default function ScanFridgePage({ setPantry, setPage, scanFile, setScanFile, scanPreview, setScanPreview, scanProgress, setScanProgress, scanResult, setScanResult, scanError, setScanError, scanLoading, setScanLoading }) {
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  function handleFile(nextFile) {
    if (!nextFile) return;
    setScanFile(nextFile);
    setScanPreview(URL.createObjectURL(nextFile));
    setScanResult(null);
    setScanError('');
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
      // Refresh pantry from the server (saved by the detection endpoint)
      try {
        const pantryData = await getPantry();
        setPantry(pantryData);
      } catch (err) {
        // ignore pantry fetch errors for now
      }
      setScanProgress(100);
    } catch (scanError) {
      setScanError(scanError?.response?.data?.detail || scanError?.message || 'Scan failed. Please try another image.');
      setScanProgress(0);
    } finally {
      setScanLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <AiChef message={scanLoading ? 'Scanning labels, colors, and fridge clues.' : 'Drop a fridge photo and I will start the pantry sketch.'} />
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
            {scanPreview ? (
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
            <ComicButton icon={Camera} variant="green" onClick={() => cameraRef.current?.click()}>Camera</ComicButton>
            <ComicButton icon={scanLoading ? Loader2 : UploadCloud} onClick={scan} disabled={!scanFile || scanLoading}>{scanLoading ? 'Scanning' : 'Scan Now'}</ComicButton>
          </div>
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
            {scanResult?.ingredients?.length ? scanResult.ingredients.map((ingredient) => <IngredientBadge key={ingredient.id} ingredient={ingredient} />) : <p className="font-hand text-2xl">Ingredient badges will pop here.</p>}
          </div>
          {scanResult ? (
            <ComicButton className="mt-6 w-full" onClick={() => setPage('pantry')}>Open Pantry</ComicButton>
          ) : null}
        </ComicCard>
      </div>
    </div>
  );
}
