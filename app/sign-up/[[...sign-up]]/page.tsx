import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p style={{ fontSize: 11, color: '#4ADE80', letterSpacing: 5,
                    textTransform: 'uppercase', margin: '0 0 8px',
                    fontWeight: 500 }}>
          Un Momento Prints
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 500, color: '#fff', margin: 0 }}>
          Create your account
        </h1>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorBackground:      '#ffffff',
            colorText:            '#0a0a0a',
            colorPrimary:         '#16a34a',
            colorInputBackground: '#f5f5f5',
            colorInputText:       '#0a0a0a',
            borderRadius:         '8px',
          },
        }}
      />
    </main>
  );
}