import { Button } from "@/components/ui/button";
import { Code, Trophy, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative bg-auth-gradient overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 text-8xl font-mono text-white">&lt;/&gt;</div>
        <div className="absolute top-40 right-32 text-6xl font-mono text-white">{ }</div>
        <div className="absolute bottom-32 left-40 text-7xl font-mono text-white">[ ]</div>
        <div className="absolute bottom-20 right-20 text-5xl font-mono text-white">( )</div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-32 left-16 w-16 h-16 border border-white/20 rounded-full animate-float" style={{ animationDelay: '0s' }} />
      <div className="absolute top-20 right-24 w-12 h-12 border border-white/20 rounded-lg rotate-45 animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-40 left-32 w-20 h-20 border border-white/20 rounded-full animate-float" style={{ animationDelay: '4s' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Sharpen Your Coding Skills.
            <br />
            <span className="text-secondary">Ace Every Test.</span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
            Practice coding challenges, take subject tests, and track your progress 
            in our AI-powered examination portal.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button 
              size="lg" 
              variant="authSecondary"
              className="text-lg px-8 py-4 h-auto"
              onClick={() => navigate("/dashboard")}
            >
              <Code className="mr-2 h-5 w-5" />
              Start Practicing
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-4 h-auto border-white/30 text-white hover:bg-white/10"
              onClick={() => navigate("/dashboard")}
            >
              <Target className="mr-2 h-5 w-5" />
              Take a Test
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">500+</div>
              <div className="text-white/80">Coding Challenges</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">10k+</div>
              <div className="text-white/80">Students Learning</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-2">98%</div>
              <div className="text-white/80">Success Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};