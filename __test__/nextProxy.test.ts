
import { describe, expect, test } from '@jest/globals';
import "dotenv/config";
import { config } from "dotenv";

config({
  path: [`.env.${process.env.NODE_ENV}`],
});


const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;

const proxyHosts = Object.entries(process.env).reduce((acc, [key, host]) => {
  if (key.trim().startsWith("PROXY_HOST_")) {
    acc.push(`http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${host}`);
  }
  return acc;
}, [] as string[]);

const numberOfProxies = proxyHosts.length;
let currProxyIdx = 0;

const nextProxyUrlStr = () => {
  // default one proxy
  if (numberOfProxies === 1) {
    return proxyHosts[0];
  }

  if(currProxyIdx === 0){
    currProxyIdx += 1;
    return proxyHosts[0];
  }else if (currProxyIdx === numberOfProxies){
    currProxyIdx = 0;
    currProxyIdx += 1;
    return proxyHosts[0];
  }else{
    const curr = currProxyIdx;
    currProxyIdx += 1;
    return proxyHosts[curr];
  }
};
describe("Filter function", () => {
  test('adds 1 + 2 to equal 3', () => {
      for (let index = 0; index < numberOfProxies + 9; index++) {
        console.log(index,nextProxyUrlStr())
      }
      
      expect(3).toBe(2);
    });

})