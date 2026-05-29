import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#666', letterSpacing: 4,
                    textTransform: 'uppercase', margin: '0 0 20px' }}>
          Un Momento Prints
        </p>
        <SignUp
          appearance={{
            variables: {
              colorBackground:      '#111',
              colorText:            '#ffffff',
              colorPrimary:         '#4ADE80',
              colorInputBackground: '#1a1a1a',
              colorInputText:       '#ffffff',
              borderRadius:         '8px',
            }
          }}
        />
      </div>
    </main>
  );
}