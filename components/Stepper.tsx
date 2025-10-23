import { cn } from '@/lib/utils'; // ShadCN utility for classnames
import { CheckCircle, Circle } from 'lucide-react';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={cn('flex items-center space-x-2', index < currentStep ? 'text-green-500' : index === currentStep ? 'text-blue-500' : 'text-gray-400')}>
            {index < currentStep ? <CheckCircle /> : <Circle />}
            <span>{step}</span>
          </div>
          {index < steps.length - 1 && <div className="flex-1 h-0.5 bg-gray-200 mx-4" />}
        </div>
      ))}
    </div>
  );
}