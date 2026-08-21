import { cn } from '@/lib/utils/cn'

const SIZE = {
  sm: 28,
  md: 36,
  lg: 48,
} as const

type AvatarSize = keyof typeof SIZE

/** 사진은 쓰지 않는다. 이름 첫 글자만 둔다. */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: AvatarSize
  className?: string
}) {
  const px = SIZE[size]

  return (
    <span
      style={{ width: px, height: px }}
      className={cn(
        'border-surface bg-accent-soft relative inline-block shrink-0 overflow-hidden rounded-full border-2',
        className,
      )}
    >
      <span className="font-display flex h-full w-full items-center justify-center text-xs font-semibold">
        {name.slice(0, 1)}
      </span>
      <span className="sr-only">{name}</span>
    </span>
  )
}

/** 겹쳐 놓은 멤버 목록. 참고 이미지의 그룹 아바타처럼 왼쪽으로 조금씩 물린다. */
export function AvatarStack({
  people,
  size = 'sm',
  label,
}: {
  people: { id: string; name: string }[]
  size?: AvatarSize
  label: string
}) {
  return (
    <ul className="flex items-center -space-x-2" aria-label={label}>
      {people.map((person) => (
        <li key={person.id}>
          <Avatar name={person.name} size={size} />
        </li>
      ))}
    </ul>
  )
}
