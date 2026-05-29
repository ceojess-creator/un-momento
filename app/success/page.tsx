import { Suspense } from 'react';
import SuccessContent from './SuccessContent';

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main style={{
        minHeight: '100vh', background: '#0a0a0a',
        color: '#fff', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      }}>
        <p style={{ color: '#888' }}>Loading...</p>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}