import { Link } from 'react-router-dom'

interface UserLinkProps {
  userId?: string | null
  name?: string
  className?: string
}

// Links an author/member name to their neighborhood profile page.
export default function UserLink({ userId, name, className }: UserLinkProps) {
  const display = name || 'Neighbor'
  if (!userId) {
    return <span className={className}>{display}</span>
  }
  return (
    <Link
      to={`/users/${userId}`}
      className={`${className ?? ''} hover:underline`}
      onClick={(e) => e.stopPropagation()}
    >
      {display}
    </Link>
  )
}
