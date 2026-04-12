interface VoteBarProps {
  label: string
  value: number
  max: number
  color?: string
}

export default function VoteBar({
  label,
  value,
  max,
  color = "bg-blue-400",
}: VoteBarProps) {

  const percentage = max === 0 ? 0 : (value / max) * 100

  return (
    <div className="flex flex-col items-center w-10">

      <div className="w-full bg-gray-200 rounded-xl h-48 flex items-end overflow-hidden">

        <div
          className="w-full rounded-full transition-all duration-500"
          style={{
            height: `${percentage}%`,
            backgroundColor: color,
          }}
        />

      </div>

      <div className="text-sm mt-2 text-center">
        {label}
      </div>

      <div className="text-xs text-gray-600">
        {value} / {max}
      </div>

    </div>
  )
}
