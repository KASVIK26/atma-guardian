import { motion } from "framer-motion";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PageHeaderProps {
  title?: string;
  description?: string;
  subtitle?: string;
  icon?: ReactNode;
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  actions?: ReactNode;
  customGreeting?: string;
  userName?: string;
  timeOfDay?: "morning" | "afternoon" | "evening";
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export function PageHeader({
  title,
  description,
  subtitle,
  icon,
  badge,
  actions,
  customGreeting,
  userName,
  timeOfDay
}: PageHeaderProps) {
  const renderTitle = () => {
    if (customGreeting && userName && timeOfDay) {
      return (
        <h1 className="text-3xl font-bold mb-2">
          {customGreeting} {userName}! 👋
        </h1>
      );
    }
    
    if (!title) return null;
    
    return (
      <div className="flex items-center gap-3">
        {icon && <div className="text-3xl">{icon}</div>}
        <h1 className="text-3xl font-bold">{title}</h1>
        {badge && (
          <Badge variant={badge.variant || "default"} className="ml-2">
            {badge.text}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <motion.div {...fadeInUp} className="mb-8">
      <div className="flex items-center justify-between">
        <div>
          {renderTitle()}
          {subtitle && (
            <p className="text-lg text-muted-foreground mb-2">{subtitle}</p>
          )}
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
