import type { Metadata } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';

const heebo = Heebo({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  title: 'BrightSuite',
  description: 'פלטפורמת כלי שיווק מאוחדת לניהול קמפיינים, תקציבים ודוחות',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className={`${heebo.className} min-h-screen`}>
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
