import 'mocha';
import { ConfigurationManager } from '../src/configuration/ConfigurationManager';

let chai = require('chai');

describe('Configuration Manager', function () {
    describe('save', function () {
        it('', function () {
            let manager = new ConfigurationManager();
            manager.addConfigItem('email', 'smtpHost', 'mx1.perkinelmer.com');
            manager.addConfigItem('email', 'smtpPort', '25');
            
            manager.save();
        })
    })
});