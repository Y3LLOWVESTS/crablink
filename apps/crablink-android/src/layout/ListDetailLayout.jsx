export function ListDetailLayout({
  primary,
  detail,
  supporting = null,
}) {
  return (
    <div className="android-list-detail">
      <section className="android-list-detail__primary">
        {primary}
      </section>
      <section className="android-list-detail__detail">
        {detail}
      </section>
      {supporting ? (
        <aside className="android-list-detail__supporting">
          {supporting}
        </aside>
      ) : null}
    </div>
  );
}
