export function Loading({ message = 'Đang tải...' }: { message?: string }) {
  return (
    <div className="page-center">
      <div className="spinner" aria-hidden="true" /> {message}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="error-box" role="alert">
      {message}
    </div>
  );
}
