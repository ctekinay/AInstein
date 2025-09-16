import { Toaster } from 'react-hot-toast';
import { ChatInterface } from './components/ChatInterface';
import './index.css';

function App() {
  return (
    <>
      <ChatInterface />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
          },
          error: {
            duration: 5000,
          },
        }}
      />
    </>
  );
}

export default App;