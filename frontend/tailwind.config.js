/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fff3d6',
        paper: '#fffaf0',
        tomato: '#ef4444',
        leaf: '#4f9f52',
        butter: '#ffd166',
        cocoa: '#6f4e37',
        ink: '#211a16',
        peach: '#ffb38a',
      },
      boxShadow: {
        comic: '5px 5px 0 #211a16',
        sticker: '3px 4px 0 rgba(33,26,22,0.9)',
        soft: '0 16px 40px rgba(111,78,55,0.14)',
      },
      fontFamily: {
        display: ['Bangers', 'cursive'],
        hand: ['Patrick Hand', 'Comic Neue', 'cursive'],
        doodle: ['Kalam', 'Comic Neue', 'cursive'],
        body: ['Inter', 'Poppins', 'sans-serif'],
      },
      borderWidth: {
        3: '3px',
      },
      backgroundImage: {
        paper: 'radial-gradient(circle at 1px 1px, rgba(33,26,22,.08) 1px, transparent 0)',
      },
    },
  },
  plugins: [],
};
