import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Link } from 'react-router';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { ForwardIcon, PlusIcon } from '../../components/icons';
import { Loading } from '../../components/Loading';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { createPartner, listPartners } from '../../db/partners';

/** Teammates you can pick when starting a workout; each has a page with their records. */
export function PartnersScreen() {
  const partners = useLiveQuery(listPartners);
  const [adding, setAdding] = useState(false);

  return (
    <Screen title="Coéquipiers" back>
      <p className="mt-1 text-sm font-semibold text-muted">
        Quand tu commences une séance, choisis avec qui tu t’entraînes : tu notes ses séries à côté des
        tiennes. Ses perfs ne comptent jamais dans tes stats.
      </p>
      {partners === undefined ? (
        <Loading />
      ) : partners.length === 0 ? (
        <EmptyState
          title="Aucun coéquipier"
          description="Ajoute les amis avec qui tu t’entraînes, puis choisis-les au début d’une séance."
        />
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {partners.map((p) => (
            <li key={p.id}>
              <Link
                to={`/settings/partners/${p.id}`}
                className="flex min-h-16 items-center gap-3 py-3 active:opacity-60"
              >
                <span className="flex-1 truncate text-xl headline">{p.name}</span>
                <ForwardIcon className="size-5 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button className="mt-4 w-full" onClick={() => setAdding(true)}>
        <PlusIcon className="size-5" /> Ajouter un coéquipier
      </Button>
      <AddPartnerSheet open={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}

/** Creates a teammate; returns their id through `onCreated` when given. */
export function AddPartnerSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: number) => void;
}) {
  const [name, setName] = useState('');
  async function save() {
    if (!name.trim()) return;
    const id = await createPartner(name);
    setName('');
    onClose();
    onCreated?.(id);
  }
  return (
    <BottomSheet open={open} onClose={onClose} title="Nouveau coéquipier">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField label="Prénom" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
        <Button type="submit" className="mt-4 w-full" disabled={!name.trim()}>
          Enregistrer
        </Button>
      </form>
    </BottomSheet>
  );
}
