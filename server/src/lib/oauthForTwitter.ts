/**
 * TwitterのためにつくったOAuth認証。OAuth 1.0 Revision A
 * 仕様書 https://oauth.net/core/1.0a/
 * 仕様書の日本語翻訳 https://openid-foundation-japan.github.io/rfc5849.ja.html
 */

/**
 * Constructor
 * @param {Object} opts consumer key (API key) and secret
 */
export default class OAuth {
    private consumer: Consumer;
    private version = "1.0" as const;
    private parameter_seperator = ", " as const;
    private last_ampersand = true as const;
    private signature_method: string;
    private hash_function: HashFunction;

    constructor(opts: {
        consumer: Consumer;
        hashFunction: HashFunction;
        signatureMethod: string;
    }) {
        this.consumer = opts.consumer;

        this.signature_method = opts.signatureMethod;

        this.hash_function = opts.hashFunction;

        if (!opts.hashFunction) {
            throw new Error("hash_function option is required");
        }

        this.hash_function = opts.hashFunction;
    }

    /**
     * OAuth request authorize
     */
    authorize = (request: RequestOptions): Authorization => {
        const data: Data = {
            oauth_consumer_key: this.consumer.key,
            oauth_nonce: createNonce(),
            oauth_signature_method: this.signature_method,
            oauth_timestamp: this.getTimeStamp(),
            oauth_version: this.version
        };
        return {
            ...data,
            oauth_signature: this.getSignature(request, undefined, data)
        };
    };

    /**
     * Create a OAuth Signature
     */
    getSignature = (
        request: RequestOptions,
        token_secret: string | undefined,
        oauth_data: Data
    ): string =>
        this.hash_function(
            this.getBaseString(request, oauth_data),
            this.getSigningKey(token_secret)
        );

    /**
     * Base String = Method + Base Url + ParameterString
     * @param  {Object} request data
     * @param  {Object} OAuth data
     * @return {String} Base String
     */
    getBaseString = (request: RequestOptions, oauth_data: Data): string =>
        request.method.toUpperCase() +
        "&" +
        this.percentEncode(this.getBaseUrl(request.url)) +
        "&" +
        this.percentEncode(this.getParameterString(request, oauth_data));

    /**
     * Get data from url
     * -> merge with oauth data
     * -> percent encode key & value
     * -> sort
     */
    getParameterString = (
        request: RequestOptions,
        oauth_data: Data
    ): string => {
        var base_string_data = sortObject(
            this.percentEncodeData(
                mergeObject(
                    oauth_data,
                    mergeObject(request.data, this.deParamUrl(request.url))
                )
            )
        );

        var data_str = "";

        //base_string_data to string
        for (var i = 0; i < base_string_data.length; i++) {
            var key = base_string_data[i].key;
            var value = base_string_data[i].value;
            // check if the value is an array
            // this means that this key has multiple values
            if (value && Array.isArray(value)) {
                // sort the array first
                value.sort();

                var valString = "";
                // serialize all values for this key: e.g. formkey=formvalue1&formkey=formvalue2
                value.forEach((item, i) => {
                    valString += key + "=" + item;
                    if (i < value.length) {
                        valString += "&";
                    }
                });
                data_str += valString;
            } else {
                data_str += key + "=" + value + "&";
            }
        }

        //remove the last character
        data_str = data_str.substr(0, data_str.length - 1);
        return data_str;
    };

    /**
     * Create a Signing Key
     */
    getSigningKey = (token_secret: string | undefined): string => {
        token_secret = token_secret || "";

        if (!this.last_ampersand && !token_secret) {
            return this.percentEncode(this.consumer.secret);
        }

        return (
            this.percentEncode(this.consumer.secret) +
            "&" +
            this.percentEncode(token_secret)
        );
    };

    /**
     * Get base url
     */
    getBaseUrl = (url: string) => {
        return url.split("?")[0];
    };

    /**
     * Get data from String
     * @param  {String} string
     * @return {Object}
     */
    deParam = (string: string): Param => {
        var arr = string.split("&");
        var data = {};

        for (let i = 0; i < arr.length; i++) {
            var item = arr[i].split("=");

            // '' value
            item[1] = item[1] || "";

            // check if the key already exists
            // this can occur if the QS part of the url contains duplicate keys like this: ?formkey=formvalue1&formkey=formvalue2
            if (data[item[0]]) {
                // the key exists already
                if (!Array.isArray(data[item[0]])) {
                    // replace the value with an array containing the already present value
                    data[item[0]] = [data[item[0]]];
                }
                // and add the new found value to it
                data[item[0]].push(decodeURIComponent(item[1]));
            } else {
                // it doesn't exist, just put the found value in the data object
                data[item[0]] = decodeURIComponent(item[1]);
            }
        }

        return data;
    };

    /**
     * Get data from url
     */
    deParamUrl = (url: string): Param => {
        var tmp = url.split("?");

        if (tmp.length === 1) {
            return {};
        }

        return this.deParam(tmp[1]);
    };

    /**
     * Form data encoding.
     */
    percentEncode = (str: string): string =>
        encodeURIComponent(str)
            .replace(/\!/g, "%21")
            .replace(/\*/g, "%2A")
            .replace(/\'/g, "%27")
            .replace(/\(/g, "%28")
            .replace(/\)/g, "%29");

    /**
     * Percent Encode Object
     */
    percentEncodeData = data => {
        var result = {};

        for (var key in data) {
            var value = data[key];
            // check if the value is an array
            if (value && Array.isArray(value)) {
                var newValue = [];
                // percentEncode every value
                value.forEach(val => {
                    newValue.push(this.percentEncode(val));
                });
                value = newValue;
            } else {
                value = this.percentEncode(value);
            }
            result[this.percentEncode(key)] = value;
        }

        return result;
    };

    /**
     * Get OAuth data as Header
     */
    toHeaderString = (oauth_data: Authorization): string => {
        var sorted = sortObject(oauth_data);

        var header_value = "OAuth ";

        for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].key.indexOf("oauth_") !== 0) continue;

            header_value +=
                this.percentEncode(sorted[i].key) +
                '="' +
                this.percentEncode(sorted[i].value) +
                '"' +
                this.parameter_seperator;
        }

        return header_value.substr(
            0,
            header_value.length - this.parameter_seperator.length
        ); //cut the last chars
    };

    /**
     * Get Current Unix TimeStamp
     */
    getTimeStamp = (): number => Math.floor(new Date().getTime() / 1000);
}

interface Consumer {
    key: string;
    secret: string;
}

type HashFunction = (base_string: any, key: any) => string;

interface Data {
    oauth_consumer_key: string;
    oauth_nonce: string;
    oauth_signature_method: string;
    oauth_timestamp: number;
    oauth_version: string;
    oauth_token?: string;
    oauth_body_hash?: string;
}

interface Authorization extends Data {
    oauth_signature: string;
}

interface RequestOptions {
    url: string;
    method: string;
    data: any;
}

interface Param {
    [key: string]: string | Array<String>;
}

/**
 * Create a random word characters string with input length
 */
const createNonce = (): string => {
    const word_characters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";

    for (var i = 0; i < 32; i++) {
        result += word_characters.charAt(
            Math.random() * word_characters.length
        );
    }

    return result;
};

/**
 * Merge object
 */
const mergeObject = <T, U>(obj1: T, obj2: U): T & U => ({ ...obj1, ...obj2 });

/**
 * Sort object by key
 * @param  {Object} data
 * @return {Array} sorted array
 */
const sortObject = <O extends { [k: string]: any }, K extends string>(
    data: O
): Array<{ key: keyof O; value: O[K] }> => {
    var keys = Object.keys(data);
    var result = [];

    keys.sort();

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        result.push({
            key: key,
            value: data[key]
        });
    }

    return result;
};
