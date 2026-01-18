interface ControlButtonProps {
  onClick: () => void;
  icon: React.ReactNode;
  label?: string;
  isActive?: boolean;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
  className?: string;
}

export default function ControlButton({
  onClick,
  icon,
  label,
  isActive = false,
  variant = 'default',
  disabled = false,
  className = '',
}: ControlButtonProps) {
  const baseStyles = "rounded-full min-w-auto w-12 h-12 flex items-center justify-center transition-all duration-200";
  
  const variantStyles = {
    default: isActive 
      ? "bg-white text-gray-800" 
      : "bg-gray-750 text-white hover:bg-gray-700",
    danger: "bg-red-650 text-white hover:bg-red-700",
    success: "bg-green-150 text-white hover:bg-green-600",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={label}
    >
      {icon}
    </button>
  );
}
