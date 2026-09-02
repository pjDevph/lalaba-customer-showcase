/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Lalaba "Clean Trust" brand palette (see src/theme/tokens.ts)
        brand: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2457D6", // primary
          700: "#173B98",
          800: "#1E40AF",
          900: "#1E3A8A",
        },
        // Home Washer accent (teal)
        washer: {
          50: "#E8F7F4",
          500: "#168A7A",
        },
        ink: "#172033",
        muted: "#667085",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "System"],
      },
    },
  },
  plugins: [],
};
