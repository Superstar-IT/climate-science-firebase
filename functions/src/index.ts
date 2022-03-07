import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

interface ScoreItem {
  id: string;
  teamName: string;
  score: number;
}

export const seedFakeScores = functions.https.onRequest(
    async (request, response) => {
      let i = 0;
      while (i < 15) {
        const teamName = `Test Team ${i+1}`;
        let score = 0;
        if (i < 5) {
          score = getRandomFloat(1, 2, 2);
        } else if (i< 10) {
          score = getRandomFloat(5, 6, 2);
        } else if (i< 15) {
          score = getRandomFloat(9, 10, 2);
        }

        await admin.firestore().collection("score-data")
            .add({teamName, score})
            .catch((err) => {
              response.status(500).send(err.message);
            });
        i++;
      }

      response.json({success: true});
    });

export const getScores = functions.https.onRequest((request, response) => {
  geScores().then((scores) => response.json(scores))
      .catch((err) => response.status(500).send(err.message));
});

export const calculatePerecentile = functions.https.onRequest(
    async (request, response) => {
      try {
        const scores = await geScores();
        const percentile:any = {};
        await Promise.all(scores.map((score) => {
          const level = Math.floor(getPercentile(score.score, 10, 2) / 10);
          switch (level) {
            case 1:
              if (percentile["10th"]) percentile["10th"]++;
              else percentile["10th"] = 1;
              break;
            case 5:
              if (percentile["50th"]) percentile["50th"]++;
              else percentile["50th"] = 1;
              break;
            case 9:
              if (percentile["90th"]) percentile["90th"]++;
              else percentile["90th"] = 1;
              break;
            default:
              break;
          }
        }));
        response.json(percentile);
      } catch (error:any) {
        response.status(500).send(error.message);
      }
    });

const getRandomFloat = (min: number, max: number, decimals: number): number => {
  const str = (Math.random() * (max - min) + min).toFixed(decimals);
  return parseFloat(str);
};

const getPercentile = (
    value: number,
    max: number,
    decimals: number
): number => {
  const percentile = (value / max * 100).toFixed(decimals || 2);
  return parseFloat(percentile);
};

const geScores = async ():Promise<ScoreItem[]> => {
  const result: ScoreItem[] = [];
  await admin.firestore().collection("score-data")
      .get()
      .then((scores) => {
        scores.forEach((score) => {
          const scoreData = score.data();
          result.push({
            id: score.id,
            teamName: scoreData.teamName,
            score: scoreData.score,
          });
        });
      })
      .catch((err) => {
        throw new Error(err.message);
      });

  return result;
};
