exports.logValue = (message) => (a) => () => {
  console.log(message, a);
};
