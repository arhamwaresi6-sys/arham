import "./globals.css";
import Header from "../components/Header";
import { AuthProvider } from "../components/AuthProvider";
import { CartProvider } from "../components/CartProvider";

export const metadata = {
  title: "Rongkushol — Everyday pieces, unexpected energy",
  description: "Find easy comfort and everyday character in the Rongkushol collection.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <CartProvider>
            <Header />
            {children}
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
