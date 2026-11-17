import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button } from '../../components/Button';
import { ConfirmSheet } from '../../components/ConfirmSheet';
import { EmptyState } from '../../components/EmptyState';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { listExercises } from '../../db/exercises';
import { deletePartner, getPartner, listPartnerRecords, renamePartner } from '../../db/partners';
import type { Partner } from '../../db/db';
import { formatWeight } from '../../lib/format';

/** A teammate: their name, and their best sets per exercise from your workouts together. */
export function PartnerScreen() {
  const id = Number(useParams().id);
  const partner = useLiveQuery(async () => (await getPartner(id)) ?? null, [id]);

  if (partner === undefined) {
    return (
      <Screen title="Coéquipier" back>
        <Loading />
      </Screen>
    );
  }
  if (partner === null) {
    return (
      <Screen title="Coéquipier" back>
        <EmptyState title="Coéquipier introuvable" description="Il a peut-être été supprimé." />
      </Screen>
    );
  }
  // Keyed by the loaded record: useLiveQuery briefly returns the previous one when the id changes.
  return <PartnerDetails key={partner.id} partner={partner} />;
}

function PartnerDetails({ partner }: { partner: Partner }) {
  const navigate = useNavigate();
  const [name, setName] = useState(partner.name);
  const [confirm, setConfirm] = useState(false);
  const records = useLiveQuery(() => listPartnerRecords(partner.id), [partner.id]);
  const exercises = useLiveQuery(listExercises);
  const names = new Map(exercises?.map((e) => [e.id, e.name]));

  return (
    <Screen title={partner.name} back>
      <TextField
        label="Prénom"
        value={name}
        autoComplete="off"
        onChange={(e) => setName(e.target.value)}
        onBlur={() => void renamePartner(partner.id, name)}
      />

      <h2 className="mt-6 text-[1.375rem] leading-tight headline">Records</h2>
      {records === undefined || exercises === undefined ? (
        <Loading />
      ) : records.length === 0 ? (
        <EmptyState
          title="Pas encore de séance"
          description="Ses records apparaîtront après une séance terminée avec toi."
        />
      ) : (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {records
            .map((r) => ({ ...r, name: names.get(r.exerciseId) ?? 'Exercice supprimé' }))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((r) => (
              <li key={r.exerciseId} className="flex min-h-14 items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-extrabold">{r.name}</span>
                  <span className="block text-xs font-semibold text-muted">
                    {r.sessions} séance{r.sessions > 1 ? 's' : ''}
                  </span>
                </span>
                {r.records.weight ? (
                  <span className="text-lg font-black tabular-nums">
                    {formatWeight(r.records.weight.weightKg)} kg × {r.records.weight.reps}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-muted">PDC</span>
                )}
              </li>
            ))}
        </ul>
      )}

      <Button variant="danger" className="mt-8 w-full" onClick={() => setConfirm(true)}>
        Supprimer le coéquipier
      </Button>
      <ConfirmSheet
        open={confirm}
        title={`Supprimer ${partner.name} ?`}
        message="Ses séries notées pendant tes séances seront supprimées. Tes séances et tes perfs restent intactes."
        confirmLabel="Supprimer"
        onConfirm={() => {
          setConfirm(false);
          void deletePartner(partner.id).then(() => navigate('/settings/partners', { replace: true }));
        }}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  );
}
