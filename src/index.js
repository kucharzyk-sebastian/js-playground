import { hello } from './hello'
import { awsConfig, authConfig } from './env'

import {fromCognitoIdentityPool} from '@aws-sdk/credential-providers'
import { v4 as uuidv4 } from 'uuid';

import {
	CognitoUserPool,
	CognitoUserAttribute,
    AuthenticationDetails,
    CognitoUser,
} from 'amazon-cognito-identity-js';

import { S3Client, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";

// const myFirstActionBtn = document.querySelector('.myFirstActionBtn');
// myFirstActionBtn.addEventListener('click', hello)

const listMyBucketsBtn = document.querySelector('.listMyBucketsBtn');
listMyBucketsBtn.addEventListener('click', () => listMyBuckets())

const uploadFileBtn = document.querySelector('button.uploadBtn');
const uploadFilesInput = document.querySelector('.upload input[name="files"]');
uploadFileBtn.addEventListener('click', () => uploadFile())


const getToken = () => {
    return new Promise((resolve, reject) => {
        const cognitoUser =  userPool.getCurrentUser();
        if (cognitoUser == null) {
            reject('User not authorized')
        }
        cognitoUser.getSession((err, session) => {
            if (err) {
                reject(err);
            }
            resolve(session.getIdToken().getJwtToken());
        })
    })
}

const getCredentials = (token) => {
    return fromCognitoIdentityPool({
        clientConfig: {
            region: awsConfig.region
        },
        identityPoolId: authConfig.identityPoolId,
        logins: {
            [authConfig.loginName]: token,
        }
    })
}

const getAuthenticatedS3Client = (credentials) => {
    const client = new S3Client({
        region: awsConfig.region,
        credentials: credentials
    });
    return client;
}

const uploadFile = async () => {
    console.log(uploadFilesInput)
    if (!uploadFilesInput.files.length)
    return
    console.log('Uploading file')

    const client = await getToken()
    .then(token =>  getCredentials(token))
    .then(credentials => getAuthenticatedS3Client(credentials))
    .catch(err => console.log(":((("))

    const filesToBeUploaded = [...uploadFilesInput.files];

    filesToBeUploaded.forEach((file, _) => {
        const fileKey = `files/${uuidv4()}/${file.name}`;
        const params = {
            Body: file,
            Bucket: awsConfig.bucket,
            Key: fileKey
        };
        const command = new PutObjectCommand(params);

        return client.send(command)
            .then(response => {
                return {...response, uniqueKey: fileKey}
            })
    });
}

const listMyBuckets = async () => {
    const client = await getToken()
    .then(token =>  getCredentials(token))
    .then(credentials => getAuthenticatedS3Client(credentials))
    .catch(err => console.log(":((("))

    const listObjectsParams = {
        Bucket: awsConfig.bucket
    }
    const command = new ListObjectsV2Command(listObjectsParams);
    client.send(command)
    .then(response => response.Contents)
    .then(filesObjects => filesObjects.map(file => file.Key))
    .then(names => console.log(names))

}


// stubs
const registerData = {
    email: "test123@test.com",
    pw:"test123@test.com",
    website: "mytestwebsite.pl"
}

const confirmData = {
    email: registerData.email,
    code: "123"
}

const loginData = {
    email: registerData.email,
    pw: registerData.email
}
//
const userPool = new CognitoUserPool(
    {
        UserPoolId: authConfig.userPoolId,
        ClientId: authConfig.clientId
    }
);
// User related
const register = (registerRequest) => {
    // return new Promise((resolve, reject) => {
    //     console.log("I am going to register")
    //     resolve("userId: xyz");
    // })
    return new Promise((resolve, reject) => {
        userPool.signUp(
            registerRequest.email,
            registerRequest.pw,
            [
                new CognitoUserAttribute({
                    Name: "website",
                    Value: registerRequest.website
                })
            ],
            null,
            (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            }
        )
    })
}

const confirm = (confirmRequest) => {

}

const login = (loginRequest) => {
    const authDetails = new AuthenticationDetails(
        {
            Username: loginRequest.email,
            Password: loginRequest.pw
        }
    );
    const cognitoUser = new CognitoUser({
        Username: loginRequest.email,
        Pool: userPool
    })
    return new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authDetails, {
            onSuccess: (result) => {
                resolve(result)
            },
            onFailure: (err) => {
                resolve(err)
            },
            newPasswordRequired: function(userAttributes, requiredAttributes) {
                delete userAttributes.email_verified;
                delete userAttributes.email;
                userAttributes.website = "mytestapp.com"
                console.log(userAttributes)
                cognitoUser.completeNewPasswordChallenge(loginRequest.pw, userAttributes)
            }
        })
    });



}

const registerBtn = document.querySelector(".registerBtn");
registerBtn.addEventListener("click", () => {
    register(registerData)
    .then(result => console.log(result))
    .catch(() => console.log("Error!"))
})


const confirmBtn = document.querySelector(".confirmBtn");
confirmBtn.addEventListener("click", () => {
    confirm(confirmData)
    .then(result => console.log(result))
    .catch(() => console.log("Error!"))
})

const loginBtn = document.querySelector(".loginBtn");
loginBtn.addEventListener("click", () => {
    login(loginData)
    .then(result => console.log(result))
    .catch(() => console.log("Error!"))
})
