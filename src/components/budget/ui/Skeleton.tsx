interface SkeletonProps {
  className?: string
  width?: string
  height?: string
}

export const Skeleton = ({ className = '', width, height = '20px' }: SkeletonProps) => {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height }}
    />
  )
}

export const SkeletonCard = () => (
  <div className="glass-card p-5 flex flex-col gap-3">
    <Skeleton width="60%" height="20px" />
    <Skeleton width="40%" height="14px" />
    <div className="flex gap-4 mt-2">
      <Skeleton width="80px" height="32px" />
      <Skeleton width="80px" height="32px" />
    </div>
  </div>
)
