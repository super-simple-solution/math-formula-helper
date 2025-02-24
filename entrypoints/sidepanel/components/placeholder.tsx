import EmptyImg from '@/assets/images/svg/empty.svg'

export const Placeholder = () => {
  return (
    <div className="mt-20 flex h-full flex-col items-center justify-center px-4">
      <img src={EmptyImg} alt="" className="w-[100px]" />
      <div className="mt-10 text-gray-500">
        No history yet. Copy a LaTeX formula from any page to get started.
      </div>
    </div>
  )
}
