import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * 약관 동의 형식을 검증하는 Custom Validator
 * - key는 숫자 형식의 문자열이어야 함
 * - value는 boolean이어야 함
 */
export function IsValidAgreedTerms(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidAgreedTerms',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'object' || value === null) {
            return false;
          }

          for (const [termId, isAgreed] of Object.entries(value)) {
            // 약관 ID가 숫자 형식인지 확인
            if (isNaN(Number(termId))) {
              return false;
            }

            // 동의 값이 boolean인지 확인
            if (typeof isAgreed !== 'boolean') {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          return '약관 동의 형식이 올바르지 않습니다. key는 숫자 형식이어야 하고, value는 boolean이어야 합니다.';
        },
      },
    });
  };
}

