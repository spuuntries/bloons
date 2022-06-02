// Game board utility functions
const db = (() => {
    const Enmap = require("enmap");
    return new Enmap({ name: "db" });
  })(),
  crypto = require("crypto");

module.exports = {
  getGameBoard: () => {
    // Ensure a gameboard exists
    /**
     * @type {{
     *   board: {
     *     id: string,
     *     meta: {
     *       material: string,
     *       reward: number,
     *     },
     *     state: string
     *   }[]
     * }}
     */
    let gameBoard = db.ensure("gameBoard", {
      board: [],
    });

    // If the board is empty, return "No balloons are on the board currently."
    if (gameBoard.board.length === 0) {
      return "No balloons are on the board currently.";
    }

    // Get the current state of the board
    let boardState = gameBoard.board
      .map((balloon, i) => {
        let ret;

        // If balloon is unpopped, return a balloon emoji
        if (balloon.state === "unpopped") {
          ret = "🎈";
        } else ret = "💥";

        // If index is mod 11, prepend a letter to the balloon emoji
        // the letter should be the same as the index in the alphabet
        if (i % 11 === 0) {
          ret = `${ret}${(() => {
            let a = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
            return a[(i / 11) % a.length];
          })()}`;
        }

        // If index is mod 10, return a newline at the end
        if (i % 10 === 0) {
          ret += "\n";
        }

        return ret;
      })
      .concat(
        (() => {
          // Get number of columns and prepend an array of
          // number emojis to the board state
          let numCols = Math.ceil(gameBoard.board.length / 10);
          return Array(numCols).map((_, i) => {
            let nums = [
              "1️⃣",
              "2️⃣",
              "3️⃣",
              "4️⃣",
              "5️⃣",
              "6️⃣",
              "7️⃣",
              "8️⃣",
              "9️⃣",
              "🔟",
            ];
            return nums[i];
          });
        })()
      )
      .join("");

    // Return the board state
    return boardState;
  },
};
