import { AuthCard } from "@/components/auth/AuthCard";
import authBackground from "@/assets/auth-background.jpg";

const Index = () => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-auth-gradient relative overflow-hidden"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'soft-light'
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-auth-gradient opacity-80" />
      
      {/* Floating geometric elements */}
      <div className="absolute top-20 left-10 w-20 h-20 border border-white/20 rounded-full animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-40 right-16 w-12 h-12 border border-white/20 rounded-lg rotate-45 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-32 left-20 w-16 h-16 border border-white/20 rounded-full animate-float" style={{ animationDelay: '4s' }} />
      <div className="absolute bottom-20 right-32 w-8 h-8 bg-white/10 rounded-full animate-float" style={{ animationDelay: '1s' }} />
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        <AuthCard />
      </div>
    </div>
  );
};

export default Index;
