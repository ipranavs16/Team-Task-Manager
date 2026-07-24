export default function BrandMark({ dark }) {
  return (
    <div className="brand-mark">
      <svg className="brand-flow" viewBox="0 0 28 28" fill="none">
        <path
          d="M4 20C8 20 8 8 14 8C20 8 20 20 24 20"
          stroke={dark ? '#fff' : '#2F6F5E'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="4" cy="20" r="2.5" fill="#B08900" />
        <circle cx="24" cy="20" r="2.5" fill="#2F6F5E" />
      </svg>
      <span>Flowline</span>
    </div>
  );
}
