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
  const baseStyles = "rounded-full min-w-auto w-12 h-12 flex items-center justify-center transition-all duration-200 shadow-lg";
  
  const variantStyles = {
    default: isActive 
      ? "bg-white text-gray-900 hover:bg-gray-100" 
      : "bg-gray-700/80 text-white hover:bg-gray-600",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
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
