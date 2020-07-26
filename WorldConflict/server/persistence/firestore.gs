var firestore = getFirestore();

function getFirestore() {

    var firestore = null;

    /** @return singleton firestore database instance */
    function getInstance() {
        if (!firestore) {
            const projectId = "onlinettt";
            const email = "barrybecker4-328@onlinettt.iam.gserviceaccount.com";
            firestore =  FirestoreApp.getFirestore(email, getKey(), projectId, "v1");
        }
        return firestore;
    }

    function getKey() {
        return "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3CAiYYim4X6th\nC8flvvJMaw2NggSLxr6M5ptwcM7cOf7MKYCkxLWPfPS506MzxgyOfOo+b/KDzqK5\n63/0W4tIEX0ZiJYZ2X5xO/wE9uLERodcZn9MlB1b+KoNaWSB648bLOL77rRgnXmN\nJkCRqCN16laSwRX1JoJOEVXU8i8O9C1dQioo6eVh8346YHAL6mdFNiWJ538ChWeL\nlhrtdF1EczpHbSST2NVxS0sS1/3XBgNQItwf0OW+1MZNqXIP3g7d2wpEIr8lThpV\nh1N5SOvV1sv0qNLI4X4PGEvd5fn69cowjvnSz2xfklhk4TOx4ABe8oXwwP0RIGfp\nh+4Yx+UFAgMBAAECggEAAdWRWJOllxX5nTSVJZOu5cgEWyMMjqMdZrQzxBhwG/IH\n9dZcf+Z/+ZSaf9sheDwFRqK/iWyIUQ6PsSz9veXgowB0kFehLjSChHn3f2b1qx9Z\nluykXMNq0At1Ln5R1nSMPfUp3SCkgBmmJAuNzUlgEYHm8QTvWcI7oX0Y3pW4YEoH\nlpZxE/nRTl828VuKmm+aagSg7J6WgyKqUiunhYpRgWduTJ5BxDFu/973jx6Vg7hn\nfv/h7wMSfMJ+Tbz6MZWgViuHFdT3hYNB315hYENKJvfEI4W1O1SQVXHzKYyFIqY2\nALjYfaUjriutBrSBklD3qs4W0yH8SjP+XtwWvtoOpwKBgQDvTCH9N3eLH32ejLqr\n7a333IQv8wWmekA5YYtF+iGOr8JG1vSWlpJCHEvcFc+iNaQMzo3u2JFT/ekZIEMY\n77TsxXD3oYVbZcXLYpT791mHOacM0wj6rwNNEt73xjsl+6IhxwWwQ4Fvo05XzVPW\n28xIFAeBud96h8hvybCnHyQLkwKBgQDDzoQO3fGli37Y840nEoe4qu/NiRzcInM2\n0k92by1zo4827MMPuEUb6JoTtIS1lA/iUNtH+/o+M7bPKm0Duv31CYYtkjy9g7gj\nNnPRIHmjxahQqTlDsomuTjCB6jRxtOEuAsinDnMMWKj81x1cR62vbzscd26QUX6U\nJfiLXAqcBwKBgE5xC3dA9mvhf8E4anyvZeapH5/ELyb6ThFBO3FN5DAsxyeHkRfH\n9du8ANX9RFns8YDNONOBpGn/Aqkc3UHQWeN/eV+DT/685tCb2TCbTXq5WFwo1Xmv\nYwqh0/suvPbffK9L2T6FcmmRA75ebUwyMs2x2yAYOPymg/q5B7JQz/UHAoGADGAK\n/J2OXjYYyEFsVGHZbhRvn3/g8RDEU1yrZQLVzo8xx/jiwyWUSJVE16X7FTbMYjNW\nCJCmWjQOg71csnWpA0mcz1iEuj2O77rLSxZQWcduQdrQIbUw+nE6o5tXwS/7Y1sN\nr3E8WDVqSMCXvHNTSNkw1TW/KSPdaiOUN8qTaRUCgYEAp7fTyGRamBpnLatXP5RZ\nObByZIZKtt5LlcmzrV/AlsV3f9SP1w51gBxpnSmhWyYyO3lOVhy0uVo954XK6XAm\n+t4u6jZ+apuI4SmyiUWlqfXirvPUl2ojYAMzVkSnefeamZHfn6zpICa+jtZDCjfO\nXyLcJxKstH1/D+2cD7Exrco=\n-----END PRIVATE KEY-----\n";
    }

    return {
        getInstance: getInstance,
    };
}
