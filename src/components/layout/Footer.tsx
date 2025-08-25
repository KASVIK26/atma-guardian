import { Link } from "react-router-dom";
import { School } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-gradient-primary rounded-md flex items-center justify-center">
              <School className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold">ATMA</span>
          </div>
          
          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <span>© 2025 ATMA. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}