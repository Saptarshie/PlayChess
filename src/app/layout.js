import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/navbar";
import StoreProvider from "./StoreProvider";
import { validateUser } from "./actions/auth-actions";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata = {
  title: "Play Chess",
  description: "An app built for playing chess online",
};

export default async function RootLayout({ children }) {
  const user = await validateUser();

  return (
    <html lang="en">
      <body>
        <StoreProvider user={user}>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
