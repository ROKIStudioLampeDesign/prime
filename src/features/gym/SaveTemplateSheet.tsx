import { useState } from 'react';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { saveWorkoutAsTemplate } from '../../db/workouts';

interface SaveTemplateSheetProps {
  workoutId: number;
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSaved: (templateId: number) => void;
}

/** "Enregistrer comme modèle": names and saves the workout's exercises as a template. */
export function SaveTemplateSheet({
  workoutId,
  open,
  defaultName,
  onClose,
  onSaved,
}: SaveTemplateSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Enregistrer comme modèle">
      {open && <SaveForm workoutId={workoutId} defaultName={defaultName} onSaved={onSaved} />}
    </BottomSheet>
  );
}

function SaveForm({ workoutId, defaultName, onSaved }: Omit<SaveTemplateSheetProps, 'open' | 'onClose'>) {
  const [name, setName] = useState(defaultName);
  const [saving, setSaving] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim() || saving) return;
        setSaving(true);
        try {
          onSaved(await saveWorkoutAsTemplate(workoutId, name));
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="mb-3 text-sm text-muted">
        Les exercices, le nombre de séries et les répétitions seront repris. Les charges viendront de ta
        dernière séance.
      </p>
      <TextField label="Nom du modèle" value={name} onChange={(e) => setName(e.target.value)} />
      <Button type="submit" className="mt-4 w-full" disabled={!name.trim() || saving}>
        Enregistrer
      </Button>
    </form>
  );
}
