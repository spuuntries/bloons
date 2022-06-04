require("dotenv").config();

// Game board utility functions
const db = (() => {
    const Enmap = require("enmap");
    return new Enmap({ name: "db" });
  })(),
  crypto = require("crypto"),
  unbApi = (() => {
    const { Client } = require("unb-api");
    return new Client(process.env.UNB_TOKEN);
  })();

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
    let boardState = gameBoard.board.map((balloon, i) => {
      let ret;

      // If balloon is unpopped, return a balloon emoji
      if (balloon.state === "unpopped") {
        ret = "🎈";
      } else ret = "💥";

      // If index is mod 11, prepend a letter to the balloon emoji
      // the letter should be the same as the index in the alphabet
      if (i % 10 == 0 || i == 0) {
        ret = `${(() => {
          let a = "🇦🇧🇨🇩🇪🇫🇬🇭🇮🇯";
          return a[(i / 11) % a.length];
        })()}${ret}`;
      }

      // If index is mod 9, return a newline at the end
      if (i % 9 == 0) {
        ret = `${ret}\n`;
      }

      return ret;
    });

    boardState.unshift(
      ...(() => {
        // Get number of columns and prepend an array of
        // number emojis to the board state

        // Get number of columns
        let numCols = gameBoard.board.slice(0, 9).length;
        return Array(numCols)
          .fill()
          .map((_, i) => {
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
      })(),
      "\n"
    );

    boardState.unshift("🟦");

    // Return the board state
    return boardState.join("");
  },
  /**
   * @param {string} material The material of the balloon
   * @param {number} reward The reward of the balloon
   */
  addBalloon: (material, reward) => {
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

    // Add a new balloon to the board
    gameBoard.board.push({
      id: (() => {
        function id() {
          let genId = crypto.randomBytes(2).toString("hex");
          if (gameBoard.board.find((balloon) => balloon.id === genId)) id();
          return genId;
        }

        return id();
      })(),
      meta: {
        material,
        reward,
      },
      state: "unpopped",
    });

    // Save the board
    db.set("gameBoard", gameBoard);
  },
  popBalloon: (column, row, method, guild, user) => {
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
      }),
      res = false;

    // Get the balloon to pop
    let balloon = gameBoard.board[column * 10 + row];

    // If balloon doesn't exist, return false
    if (!balloon) return res;

    // If the balloon is unpopped,
    // check if the method is appropriate for the material
    if (balloon.state === "unpopped") {
      switch (balloon.meta.material) {
        case "wood" || "plastic":
          if (method == "axe") {
            res = true;
          }
          break;
        case "paper":
          if (method == "scissors") {
            res = true;
          }
          break;
        case "metal" || "plastic":
          if (method == "saw") {
            res = true;
          }
          break;
        case "glass" || "water":
          if (method == "slam") {
            res = true;
          }
          break;
      }

      // If the method is appropriate,
      // pop the balloon and award the user
      if (res) {
        balloon.state = "popped";

        // Award the user
        (async () => {
          try {
            await unbApi.editUserBalance(
              guild.id,
              user.id,
              balloon.meta.reward
            );
          } catch (e) {
            console.log(e);
          }
        })();
      }
    }

    // Save the board
    db.set("gameBoard", gameBoard);

    // Return the result of the pop
    return res;
  },
  removeBalloon: (column, row) => {
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

    // Get the balloon to remove
    let balloon = gameBoard.board[column * 10 + row];

    // If balloon doesn't exist, return false
    if (!balloon) return false;

    // Remove the balloon
    gameBoard.board.splice(column * 10 + row, 1);

    // Save the board
    db.set("gameBoard", gameBoard);

    // Return true
    return true;
  },
};
