import React from "https://esm.sh/react@18.3.1";

export const App = () => {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1>definy</h1>
      <button
        onClick={() => {
          setCount(count + 1);
        }}
      >
        count: {count}
      </button>
    </div>
  );
};
