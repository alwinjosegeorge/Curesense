import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-display font-bold text-foreground">CureSense</h1>
        <p className="text-xl text-muted-foreground mb-6">AI-Powered Smart Treatment Intelligence</p>
        <Button onClick={() => navigate('/login')} className="gradient-medical text-primary-foreground hover:opacity-90">
          Go to Login
        </Button>
      </div>
    </div>
  );
};

export default Index;
