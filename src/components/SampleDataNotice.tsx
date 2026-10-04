import { useEffect, useState } from 'react';
import { getSampleRecordCount, removeSampleData } from '../lib/db';
import { seedOnce } from '../lib/seed';
import { useToast } from '../context/toast';

/**
 * Labels the demo records seeded on first run and offers one-click removal.
 * Renders nothing once the sample records are gone.
 */
export function SampleDataNotice() {
  const [count, setCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Wait for the first-run seeder so the notice appears in the same visit.
    let cancelled = false;
    seedOnce()
      .then(getSampleRecordCount)
      .then(n => { if (!cancelled) setCount(n); })
      .catch(() => { if (!cancelled) setCount(0); });
    return () => { cancelled = true; };
  }, []);

  if (count === 0) return null;

  const handleRemove = async () => {
    try {
      const removed = await removeSampleData();
      toast(`Removed ${removed} sample records.`, 'success');
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast('Failed to remove sample data.', 'danger');
    }
  };

  return (
    <section className="sample-notice" aria-label="Sample data notice">
      <div>
        <strong>Sample data</strong>
        <p>
          This device includes {count} example records so you can try Invois. They are not real business data.
        </p>
      </div>
      <button type="button" className="btn btn-secondary" onClick={handleRemove}>
        Remove sample data
      </button>
    </section>
  );
}
